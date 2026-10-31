from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.services.user_settings_service import UserSettingsService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_, and_, desc
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.deck.services.excel_service import ExcelDeckService
from app.modules.deck.services.deck_service import DeckService
from app.modules.deck.services.ai_service import ai_service
from app.modules.deck.schemas import DeckSchema, CardSchema, CardExplainRequest
from app.modules.deck.models import (
    UserDeckSettings, FlashcardDeck, Flashcard, DeckAttempt, UserAnswer,
    UserCardMastery, UserPracticeStats, UserCardNote, DeckSession
)
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
from app.modules.deck.services.fsrs_service import build_fsrs_card, estimate_intervals, apply_stability_boost
from app.modules.deck.utils import (
    fix_static_urls, migrate_practice_settings,
    get_enabled_practice_modes, check_has_practice_setup, check_has_mcq_setup,
    resolve_effective_study_settings
)
from .play_utils import resolve_play_cards
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Deck Play"])

@router.get("/{deck_id}/mistakes")
async def get_deck_mistakes(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import UserAnswer, Flashcard, DeckAttempt
    result = await db.execute(
        select(Flashcard)
        .join(UserAnswer, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .filter(
            DeckAttempt.user_id == user_id,
            UserAnswer.is_correct == False,
            Flashcard.deck_id == deck_id
        )
        .distinct()
    )
    mistakes = result.scalars().all()
    return mistakes


@router.get("/{deck_id}/session")
async def get_deck_session(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    return {
        "mode": "sequential",
        "current_index": 0,
        "state": {}
    }

@router.post("/{deck_id}/session")
async def save_deck_session(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    return {"status": "ok"}

@router.delete("/{deck_id}/session")
async def reset_deck_session(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    return {"status": "ok"}
@router.post("/{deck_id}/next-card")
async def get_next_card(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    mode = data.get("mode", "fsrs")
    answered_indexes = data.get("answered_indexes", [])
    answered_ids = set(data.get("answered_ids", []))
    current_index = data.get("current_index", 0)
    current_card_id = data.get("current_card_id")
    random_enabled = data.get("random_enabled", False)
    scope = data.get("scope", "all")

    from app.modules.deck.models import Flashcard, UserCardMastery
    stmt = (
        select(
            Flashcard.id,
            UserCardMastery.state,
            UserCardMastery.stability,
            UserCardMastery.due,
            UserCardMastery.last_review,
            UserCardMastery.is_ignored
        )
        .outerjoin(
            UserCardMastery,
            and_(
                UserCardMastery.card_id == Flashcard.id,
                UserCardMastery.user_id == user_id
            )
        )
        .where(Flashcard.deck_id == deck_id)
        .order_by(Flashcard.id.asc())
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return {"next_index": 0}

    card_ids = [r[0] for r in rows]
    total = len(card_ids)
    mastery_map = {}
    for r in rows:
        if r[1] is not None or r[3] is not None or r[4] is not None or r[5]:
            mastery_map[r[0]] = {
                "state": r[1] or 0,
                "stability": r[2],
                "due": r[3],
                "last_review": r[4],
                "is_ignored": bool(r[5])
            }

    ignored_indexes = set()
    for idx, c_id in enumerate(card_ids):
        m = mastery_map.get(c_id)
        if m and m["is_ignored"]:
            ignored_indexes.add(idx)

    # Support answered_ids for seamless matching when frontend reorders/filters questions
    if answered_ids:
        answered_indexes_set = {idx for idx, c_id in enumerate(card_ids) if c_id in answered_ids or idx in answered_indexes}
    else:
        answered_indexes_set = set(answered_indexes)

    effective_answered = answered_indexes_set | ignored_indexes

    # Map current_card_id to canonical card_ids index if supplied
    if current_card_id is not None:
        matched_cur = next((idx for idx, c_id in enumerate(card_ids) if c_id == current_card_id), None)
        if matched_cur is not None:
            current_index = matched_cur

    learned_cards_all = []
    new_cards_all = []
    for idx, c_id in enumerate(card_ids):
        if idx in ignored_indexes:
            continue
        m = mastery_map.get(c_id)
        is_new = not m or (m["state"] == 0 and m["last_review"] is None)
        if is_new:
            new_cards_all.append(idx)
        else:
            learned_cards_all.append(idx)

    step_type = data.get("step_type")
    original_mode = mode
    target_mode = mode
    is_roadmap = (mode == "roadmap")

    from app.modules.deck.models import UserDeckSettings
    user_sett_res = await db.execute(
        select(UserDeckSettings.settings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_settings_dict = user_sett_res.scalar_one_or_none() or {}

    if mode == "roadmap":
        st_helper = await get_deck_roadmap_status_helper(db, user_id, deck_id, user_settings_dict)
        current_step_idx = st_helper.get("current_step_index", 0)
        pipeline = st_helper.get("pipeline", [])
        active_step_type = step_type
        if not active_step_type and pipeline and current_step_idx < len(pipeline):
            active_step_type = pipeline[current_step_idx].get("type")

        if active_step_type == "fsrs_review":
            target_mode = "fsrs_review"
        elif active_step_type == "speed_skim":
            target_mode = "speed_skim"
        elif active_step_type == "new_cards":
            target_mode = "new"
        else:
            target_mode = "fsrs_review" if st_helper.get("stage_1_done") else "new"

    if target_mode == "autoplay":
        pool = list(range(total))
        if scope in ("review", "due") and learned_cards_all:
            pool = learned_cards_all
        elif scope == "new" and new_cards_all:
            pool = new_cards_all

        candidates = [idx for idx in pool if idx not in ignored_indexes]
        if not candidates:
            candidates = [idx for idx in range(total) if idx not in ignored_indexes] or [0]

        if random_enabled and len(candidates) > 1:
            import random
            other = [idx for idx in candidates if idx != current_index]
            chosen = random.choice(other) if other else candidates[0]
            return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "autoplay"}

        forward = [idx for idx in candidates if idx > current_index]
        next_seq = forward[0] if forward else candidates[0]
        return {"next_index": next_seq, "card_id": card_ids[next_seq], "phase": "autoplay"}

    if target_mode == "review":
        learned_cards = []
        for idx, c_id in enumerate(card_ids):
            if idx in ignored_indexes:
                continue
            m = mastery_map.get(c_id)
            is_new = not m or (m["state"] == 0 and m["last_review"] is None)
            if not is_new:
                learned_cards.append(idx)

        if not learned_cards:
            return {
                "next_index": -1,
                "phase": "completed",
                "is_all_completed": True,
                "unlearned_count": total,
                "total_cards": total,
                "learned_cards": 0,
                "message": "No learned cards in this deck to review yet! Please learn some new cards first."
            }

        unanswered_learned = [i for i in learned_cards if i not in effective_answered]
        if unanswered_learned:
            if len(answered_indexes) == 0:
                if random_enabled:
                    import random
                    next_idx = random.choice(unanswered_learned)
                else:
                    next_idx = unanswered_learned[0]
            else:
                candidates = [i for i in unanswered_learned if i != current_index]
                if not candidates:
                    candidates = unanswered_learned
                if random_enabled:
                    import random
                    next_idx = random.choice(candidates)
                else:
                    forward = [i for i in candidates if i > current_index]
                    next_idx = forward[0] if forward else candidates[0]
            return {
                "next_index": next_idx,
                "card_id": card_ids[next_idx],
                "phase": "review",
                "learned_cards": len(learned_cards),
                "total_cards": total
            }

        # All learned cards reviewed in this session -> Loop continuously in a cycle!
        candidates = [i for i in learned_cards if i != current_index]
        if not candidates:
            candidates = learned_cards
        if random_enabled:
            import random
            next_idx = random.choice(candidates)
        else:
            forward = [i for i in candidates if i > current_index]
            next_idx = forward[0] if forward else candidates[0]

        return {
            "next_index": next_idx,
            "card_id": card_ids[next_idx],
            "phase": "review",
            "learned_cards": len(learned_cards),
            "total_cards": total
        }

    elif target_mode == "new":
        unanswered_new = []
        all_new = []
        for idx, c_id in enumerate(card_ids):
            if idx in ignored_indexes:
                continue
            m = mastery_map.get(c_id)
            is_new = not m or (m["state"] == 0 and m["last_review"] is None)
            if is_new:
                all_new.append(idx)
                if idx not in effective_answered:
                    unanswered_new.append(idx)

        if unanswered_new:
            if len(answered_indexes) == 0:
                if random_enabled:
                    import random
                    next_idx = random.choice(unanswered_new)
                else:
                    next_idx = unanswered_new[0]
            else:
                candidates = [i for i in unanswered_new if i != current_index]
                if not candidates:
                    candidates = unanswered_new
                if random_enabled:
                    import random
                    next_idx = random.choice(candidates)
                else:
                    forward = [i for i in candidates if i > current_index]
                    next_idx = forward[0] if forward else candidates[0]
            return {
                "next_index": next_idx,
                "card_id": card_ids[next_idx],
                "phase": "new",
                "unlearned_count": len(all_new),
                "total_cards": total
            }
        else:
            # All new cards in deck have been learned!
            return {
                "next_index": -1,
                "phase": "completed",
                "is_all_completed": True,
                "unlearned_count": 0,
                "total_cards": total,
                "learned_cards": total - len(all_new),
                "message": "All new cards in this deck have been learned!"
            }

    elif target_mode in ("speed_skim", "skim", "flip"):
        if is_roadmap and active_step_type == "speed_skim":
            unanswered_new = []
            all_new = []
            for idx, c_id in enumerate(card_ids):
                if idx in ignored_indexes:
                    continue
                m = mastery_map.get(c_id)
                is_new = not m or (m["state"] == 0 and m["last_review"] is None)
                if is_new:
                    all_new.append(idx)
                    if idx not in effective_answered:
                        unanswered_new.append(idx)

            if unanswered_new:
                if random_enabled:
                    import random
                    chosen = random.choice(unanswered_new)
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "speed_skim"}
                else:
                    chosen = unanswered_new[0]
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "speed_skim"}
            elif all_new:
                if random_enabled:
                    import random
                    chosen = random.choice(all_new)
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "speed_skim"}
                else:
                    chosen = all_new[0]
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "speed_skim"}
            else:
                return {
                    "next_index": -1,
                    "phase": "completed",
                    "is_all_completed": True,
                    "message": "All new cards skimmed!"
                }

        # Free Speed Skim / Flip mode: skims through cards in deck in order or random
        scope_pool = list(range(total))
        if scope in ("review", "due") and learned_cards_all:
            scope_pool = learned_cards_all
        elif scope == "new" and new_cards_all:
            scope_pool = new_cards_all

        unanswered_all = [idx for idx in scope_pool if idx not in effective_answered and idx not in ignored_indexes]
        if unanswered_all:
            if len(answered_indexes) == 0:
                if random_enabled:
                    import random
                    chosen = random.choice(unanswered_all)
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}
                else:
                    chosen = unanswered_all[0]
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}
            else:
                candidates = [idx for idx in unanswered_all if idx != current_index]
                if not candidates:
                    candidates = unanswered_all
                if random_enabled:
                    import random
                    chosen = random.choice(candidates)
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}
                else:
                    forward = [idx for idx in candidates if idx > current_index]
                    chosen = forward[0] if forward else candidates[0]
                    return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}

        # When all cards in scope have been skimmed in session, loop continuously in a cycle
        all_candidates = [idx for idx in scope_pool if idx not in ignored_indexes and idx != current_index]
        if not all_candidates:
            all_candidates = [idx for idx in scope_pool if idx not in ignored_indexes]
        if not all_candidates:
            all_candidates = [idx for idx in range(total) if idx not in ignored_indexes] or [0]
        if random_enabled:
            import random
            chosen = random.choice(all_candidates)
            return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}
        else:
            forward = [idx for idx in all_candidates if idx > current_index]
            chosen = forward[0] if forward else (all_candidates[0] if all_candidates else 0)
            return {"next_index": chosen, "card_id": card_ids[chosen], "phase": "skim"}

    elif target_mode in ("fsrs", "fsrs_review"):
        pipeline = user_settings_dict.get("pipeline", []) if isinstance(user_settings_dict, dict) else []
        fsrs_step = next((st for st in pipeline if st.get("type") == "fsrs_review"), None)
        is_roadmap_review = (target_mode == "fsrs_review") or (original_mode == "roadmap")

        now_utc = datetime.utcnow()
        today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = today_start + timedelta(days=1)
        if is_roadmap_review:
            overdue_days = 1
            if fsrs_step:
                if "overdue_days" in fsrs_step:
                    overdue_days = max(1, int(fsrs_step.get("overdue_days", 1)))
                elif "overdue_hours" in fsrs_step:
                    overdue_days = max(1, round(int(fsrs_step.get("overdue_hours", 24)) / 24))
            cutoff_time = day_end - timedelta(days=(overdue_days - 1))
        else:
            cutoff_time = now_utc

        cards_learned_today = set()
        if is_roadmap_review:
            from app.modules.deck.models import UserAnswer, DeckAttempt
            first_answer_res = await db.execute(
                select(UserAnswer.card_id)
                .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                .where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.deck_id == deck_id,
                    DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
                )
                .group_by(UserAnswer.card_id)
                .having(func.min(UserAnswer.created_at) >= today_start)
            )
            cards_learned_today = set(first_answer_res.scalars().all())

        due_cards = []
        all_new_cards = []
        all_learned_cards = []
        future_due_dates = []

        for idx, c_id in enumerate(card_ids):
            if idx in ignored_indexes:
                continue

            m = mastery_map.get(c_id)

            # Check if card is brand new (never reviewed)
            if not m or (m["state"] == 0 and m["last_review"] is None):
                all_new_cards.append(idx)
                continue

            # Card has been learned/reviewed before
            card_info = {"idx": idx, "due": m["due"], "stability": m["stability"] or 0.0}
            all_learned_cards.append(card_info)

            # Skip cards first learned today if in roadmap review
            if is_roadmap_review and c_id in cards_learned_today:
                continue

            # Skip cards already reviewed today if in roadmap review (đã hoàn thành chỉ tiêu ôn hôm nay)
            if is_roadmap_review and m["last_review"] and m["last_review"] >= today_start:
                continue

            if m["due"]:
                if m["due"] <= cutoff_time:
                    due_cards.append(card_info)
                else:
                    future_due_dates.append(m["due"])

        # 1. PRIORITY 1: Due Review Cards (excluding already answered in this session)
        unanswered_due = [c for c in due_cards if c["idx"] not in effective_answered]

        if unanswered_due:
            if len(answered_indexes) == 0:
                candidates = unanswered_due
            else:
                candidates = [c for c in unanswered_due if c["idx"] != current_index]
                if not candidates:
                    candidates = unanswered_due

            if random_enabled:
                import random
                selected = random.choice(candidates)
            else:
                # Lowest stability first, then earliest due date
                candidates.sort(key=lambda x: (x["stability"], x["due"] or now_utc))
                selected = candidates[0]

            return {
                "next_index": selected["idx"],
                "card_id": card_ids[selected["idx"]],
                "phase": "review",
                "due_count": len(unanswered_due),
                "total_due": len(due_cards),
                "unlearned_count": len(all_new_cards),
                "total_cards": total,
                "learned_cards": len(all_learned_cards)
            }

        # If in roadmap review step, NEVER introduce new cards!
        if is_roadmap_review or target_mode == "fsrs_review":
            min_future_due = min(future_due_dates) if future_due_dates else (all_learned_cards[0]["due"] if all_learned_cards and all_learned_cards[0].get("due") else None)
            wait_sec = 600
            wait_text = "No cards due"
            if min_future_due:
                diff_sec = int((min_future_due - now_utc).total_seconds())
                wait_sec = max(60, diff_sec)
                hours = wait_sec // 3600
                minutes = (wait_sec % 3600) // 60
                days = hours // 24
                if days > 0:
                    rem_h = hours % 24
                    wait_text = f"{days}d {rem_h}h" if rem_h > 0 else f"{days}d"
                elif hours > 0:
                    wait_text = f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
                else:
                    wait_text = f"{max(1, minutes)}m"

            msg = "All due review cards completed!" if all_learned_cards else "No cards due for review in this deck!"
            return {
                "next_index": -1,
                "phase": "completed",
                "is_all_completed": True,
                "next_due_in_seconds": wait_sec,
                "next_due_text": wait_text,
                "next_due_date": min_future_due.isoformat() if min_future_due else None,
                "due_count": 0,
                "total_due": len(due_cards),
                "unlearned_count": len(all_new_cards),
                "total_cards": total,
                "learned_cards": len(all_learned_cards),
                "message": msg
            }

        # 2. PRIORITY 2: New Cards (Chế độ FSRS tự do: tiếp tục nạp từ mới nếu chưa có từ nào đến hạn ôn)
        if all_new_cards:
            unanswered_new = [i for i in all_new_cards if i not in effective_answered]
            if unanswered_new:
                if len(answered_indexes) == 0:
                    if random_enabled:
                        import random
                        next_idx = random.choice(unanswered_new)
                    else:
                        next_idx = unanswered_new[0]
                else:
                    if random_enabled:
                        candidates = [i for i in unanswered_new if i != current_index] or unanswered_new
                        import random
                        next_idx = random.choice(candidates)
                    else:
                        forward_new = [i for i in unanswered_new if i > current_index]
                        next_idx = forward_new[0] if forward_new else unanswered_new[0]
                return {
                    "next_index": next_idx,
                    "card_id": card_ids[next_idx],
                    "phase": "new",
                    "due_count": 0,
                    "total_due": len(due_cards),
                    "unlearned_count": len(all_new_cards),
                    "total_cards": total,
                    "learned_cards": len(all_learned_cards)
                }

        # 3. PRIORITY 3: All due review cards and all new cards completed! (Đã ôn hết thẻ đến hạn và đã học hết từ mới trong bộ thẻ)
        min_future_due = min(future_due_dates) if future_due_dates else (all_learned_cards[0]["due"] if all_learned_cards and all_learned_cards[0].get("due") else None)

        wait_sec = 600
        wait_text = "10m"
        if min_future_due:
            diff_sec = int((min_future_due - now_utc).total_seconds())
            wait_sec = max(60, diff_sec)

            hours = wait_sec // 3600
            minutes = (wait_sec % 3600) // 60
            days = hours // 24

            if days > 0:
                rem_h = hours % 24
                wait_text = f"{days}d {rem_h}h" if rem_h > 0 else f"{days}d"
            elif hours > 0:
                wait_text = f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
            else:
                wait_text = f"{max(1, minutes)}m"

        return {
            "next_index": -1,
            "phase": "completed",
            "is_all_completed": True,
            "next_due_in_seconds": wait_sec,
            "next_due_text": wait_text,
            "next_due_date": min_future_due.isoformat() if min_future_due else None,
            "due_count": 0,
            "total_due": len(due_cards),
            "unlearned_count": len(all_new_cards),
            "total_cards": total,
            "learned_cards": len(all_learned_cards),
            "message": "All cards in deck learned and no cards due for review!"
        }


    elif mode == "hardest":
        deck_with_stats = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
        candidates = []
        for idx in range(total):
            if idx in effective_answered:
                continue
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            t = c_stats.get("total") or 0
            c_val = c_stats.get("correct") or 0
            wrongs = t - c_val
            if t > 0:
                ratio = c_val / t
                candidates.append({"idx": idx, "ratio": ratio, "wrongs": wrongs})

        if candidates:
            if random_enabled:
                import random
                candidates.sort(key=lambda x: (x["ratio"], -x["wrongs"]))
                top_n = candidates[:min(len(candidates), 5)]
                chosen_idx = random.choice(top_n)["idx"]
                return {"next_index": chosen_idx, "card_id": card_ids[chosen_idx]}
            else:
                candidates.sort(key=lambda x: (x["ratio"], -x["wrongs"]))
                chosen_idx = candidates[0]["idx"]
                return {"next_index": chosen_idx, "card_id": card_ids[chosen_idx]}

        unanswered = [idx for idx in range(total) if idx not in effective_answered]
        if unanswered:
            if random_enabled:
                import random
                chosen_idx = random.choice(unanswered)
                return {"next_index": chosen_idx, "card_id": card_ids[chosen_idx]}
            else:
                chosen_idx = unanswered[0]
                return {"next_index": chosen_idx, "card_id": card_ids[chosen_idx]}

        fallback_idx = min(current_index + 1, total - 1)
        return {"next_index": fallback_idx, "card_id": card_ids[fallback_idx]}

    fallback_idx = min(current_index + 1, total - 1)
    return {"next_index": fallback_idx, "card_id": card_ids[fallback_idx]}

async def _generate_ai_task(deck_id: int, card_id: int, prompt_template: Optional[str] = None):
    from app.core.db import AsyncSession, engine
def _resolve_prompt_placeholders(template: str, card, deck, options_text: str, correct_answer_text: str) -> str:
    prompt = template
    
    # 1. Standard replacements
    prompt = prompt.replace("{{card}}", card.content or "")
    prompt = prompt.replace("{{question}}", card.content or "")
    prompt = prompt.replace("{{front}}", card.content or "")
    prompt = prompt.replace("{{back}}", card.explanation or "")
    prompt = prompt.replace("{{explanation}}", card.explanation or "")
    prompt = prompt.replace("{{correct_answer}}", correct_answer_text)
    prompt = prompt.replace("{{options}}", options_text)
    prompt = prompt.replace("{{global_instruction}}", (deck.instruction if deck else "") or "")
    prompt = prompt.replace("{{quiz_title}}", (deck.title if deck else "") or "")
    prompt = prompt.replace("{{deck_title}}", (deck.title if deck else "") or "")
    prompt = prompt.replace("{{quiz_description}}", (deck.description if deck else "") or "")
    prompt = prompt.replace("{{deck_description}}", (deck.description if deck else "") or "")
    
    # 2. Custom fields in card.others
    if card.others and isinstance(card.others, dict):
        for k, v in card.others.items():
            if v is not None:
                prompt = prompt.replace(f"{{{{{k}}}}}", str(v))
                prompt = prompt.replace(f"{{{{{k.lower()}}}}}", str(v))
                
    # 3. Model attribute fallbacks
    prompt = prompt.replace("{{front_audio_content}}", getattr(card, "front_audio_content", "") or "")
    prompt = prompt.replace("{{back_audio_content}}", getattr(card, "back_audio_content", "") or "")
    prompt = prompt.replace("{{front_audio_url}}", getattr(card, "front_audio_url", "") or "")
    prompt = prompt.replace("{{back_audio_url}}", getattr(card, "back_audio_url", "") or "")
    prompt = prompt.replace("{{front_img}}", getattr(card, "front_img", "") or "")
    prompt = prompt.replace("{{back_img}}", getattr(card, "back_img", "") or "")
    
    # Replace any option placeholders
    for i in range(4):
        prompt = prompt.replace(f"{{{{option_{chr(97+i)}}}}}", "")
        
    return prompt

async def _generate_ai_content_sync(db: AsyncSession, deck_id: int, card_id: int, field: str) -> str:
    from app.modules.deck.models import Flashcard, FlashcardDeck
    from app.modules.ai.services.gemini_service import GeminiService
    
    # Fetch card and deck
    card_res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    card = card_res.scalar_one_or_none()
    if not card:
        return "Card not found"
        
    deck_res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    
    gemini = await GeminiService.from_db(db)
    if not gemini.client:
        return "AI Service not configured."
        
    # Choose template
    template = None
    if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
        prompts = deck.practice_settings.get("ai_prompts", [])
        for p in prompts:
            if p.get("column") == field or p.get("id") == field:
                template = p.get("prompt")
                break
        
    if not template or not template.strip():
        return ""
        
    # Format options
    options_text = ""
    card_options = getattr(card, "options", None)
    if card_options:
        options_text = ", ".join([o.content for o in card_options])
        
    correct_answer_text = card.explanation or ""
    if card_options:
        correct_opt = next((o for o in card_options if o.is_correct), None)
        if correct_opt:
            correct_answer_text = correct_opt.content
            
    prompt = _resolve_prompt_placeholders(template, card, deck, options_text, correct_answer_text)
        
    ai_response = await gemini.generate_text(prompt)
    
    # Clean up markdown
    ai_response = ai_response.strip()
    if ai_response.startswith("```markdown"):
        ai_response = ai_response[len("```markdown"):].strip()
    elif ai_response.startswith("```"):
        ai_response = ai_response[len("```"):].strip()
    if ai_response.endswith("```"):
        ai_response = ai_response[:-3].strip()
    
    ai_response = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', ai_response)
    
    return ai_response

async def _generate_ai_task(deck_id: int, card_id: int, field: str = "explanation"):
    from app.modules.deck.models import Flashcard
    from app.core.db import engine
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm.attributes import flag_modified
    
    async with AsyncSession(engine) as db:
        content = await _generate_ai_content_sync(db, deck_id, card_id, field)
        card_res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
        card = card_res.scalar_one_or_none()
        if card:
            if field == "hint":
                card.hint = content
            elif field == "mnemonic":
                card.mnemonic = content
            elif field == "explanation":
                card.ai_explanation = content
            else:
                if not card.others:
                    card.others = {}
                if "ai_responses" not in card.others:
                    card.others["ai_responses"] = {}
                card.others["ai_responses"][field] = content
                flag_modified(card, "others")
            await db.commit()

