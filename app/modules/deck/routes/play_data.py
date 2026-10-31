from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.services.user_settings_service import UserSettingsService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_, desc
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

@router.get("/{deck_id}/data")
async def get_deck_data(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckCollaborator
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})
    
    # Check if user is collaborator
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None

    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"

    if not deck.is_public and deck.creator_id != user_id and user_id != 1 and not is_collaborator and not is_admin:
        return JSONResponse(status_code=403, content={"error": "This is a private deck"})
    
    from app.modules.deck.models import Flashcard, UserDeckSettings
    c_count_res = await db.execute(select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id))
    c_count = c_count_res.scalar()

    user_settings_res = await db.execute(
        select(UserDeckSettings.settings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_custom_settings = user_settings_res.scalar_one_or_none()
    settings_data = user_custom_settings if (user_custom_settings and isinstance(user_custom_settings, dict)) else (deck.practice_settings or {})
    pipeline = settings_data.get("pipeline", [])
    has_roadmap = bool(settings_data.get("roadmap_active", False) and isinstance(pipeline, list) and len(pipeline) > 0)
    
    # Get creator username
    creator_name = "Hệ thống"
    if deck.creator_id:
        c_user_res = await db.execute(select(UserDB.username).where(UserDB.id == deck.creator_id))
        c_name_val = c_user_res.scalar()
        if c_name_val:
            creator_name = c_name_val
        else:
            creator_name = f"user_{deck.creator_id}"

    is_creator = bool(deck.creator_id == user_id or user_id == 1 or is_admin)
    can_edit = bool(is_creator or is_collaborator)

    # Fetch recent study/practice attempts for this user on this deck
    from app.modules.deck.models import DeckAttempt, UserAnswer
    from sqlalchemy import case, or_

    recent_attempts = []
    if user_id:
        attempts_q = await db.execute(
            select(DeckAttempt)
            .where(
                DeckAttempt.deck_id == deck_id,
                DeckAttempt.user_id == user_id
            )
            .order_by(DeckAttempt.id.desc())
            .limit(15)
        )
        db_attempts = attempts_q.scalars().all()
        for att in db_attempts:
            # Check actual answers logged for this attempt
            ans_stats = await db.execute(
                select(
                    func.count(UserAnswer.id).label("total"),
                    func.sum(case((or_(UserAnswer.is_correct == True, UserAnswer.rating >= 3), 1), else_=0)).label("correct"),
                    func.min(UserAnswer.created_at).label("first_answer"),
                    func.max(UserAnswer.created_at).label("last_answer")
                )
                .where(UserAnswer.attempt_id == att.id)
            )
            row = ans_stats.one_or_none()
            total = (row.total if row and row.total else 0) or (att.total_cards or 0)
            correct = (row.correct if row and row.correct else 0) or (att.score or 0)

            # Skip empty auto-enrolled attempts with 0 answers
            if total == 0:
                continue

            started = (row.first_answer if row and row.first_answer else None) or att.started_at
            completed = (row.last_answer if row and row.last_answer else None) or att.completed_at

            recent_attempts.append({
                "id": att.id,
                "mode": att.mode or "play",
                "score": int(correct),
                "total_cards": int(total),
                "accuracy": round((correct / total) * 100) if total > 0 else 0,
                "started_at": started.isoformat() if started else "",
                "completed_at": completed.isoformat() if completed else None
            })

            if len(recent_attempts) >= 5:
                break

    return {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "instruction": deck.instruction,
        "creator_id": deck.creator_id,
        "owner_id": deck.creator_id,
        "creator_name": creator_name,
        "is_creator": is_creator,
        "is_collaborator": is_collaborator,
        "can_edit": can_edit,
        "is_admin": is_admin,
        "is_public": deck.is_public,
        "cards_count": c_count,
        "questions_count": c_count, # compatibility
        "tags": [t.name for t in deck.tags],
        "cover_image": deck.cover_image,
        "has_roadmap": has_roadmap,
        "category_name": deck.category.name if deck.category else "General",
        "practice_settings": deck.practice_settings or {},
        "study_defaults": (deck.practice_settings or {}).get("study_defaults", {}),
        "default_mode": (deck.practice_settings or {}).get("study_defaults", {}).get("learning_mode", "fsrs"),
        "recent_attempts": recent_attempts
    }

def migrate_practice_settings(settings: Optional[dict]) -> dict:
    if not settings:
        return {}
    if any(k in settings for k in ("mcq", "typing", "listening")):
        return settings
    
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    
    new_settings = dict(settings)
    new_settings["mcq"] = {"active_pairs": active_pairs, "num_choices": num_choices}
    new_settings["typing"] = {"active_pairs": active_pairs}
    new_settings["listening"] = {"active_pairs": active_pairs, "num_choices": num_choices}
    return new_settings

@router.get("/quick-play-data")
async def get_quick_play_data(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    # 1. Fetch all decks connected to this user
    from app.modules.deck.models import FlashcardDeck, DeckCollaborator, DeckAttempt
    
    attempt_sub = select(DeckAttempt.deck_id).where(DeckAttempt.user_id == user_id).scalar_subquery()
    collab_sub = select(DeckCollaborator.deck_id).where(DeckCollaborator.user_id == user_id).scalar_subquery()
    
    deck_stmt = select(FlashcardDeck).where(
        or_(
            FlashcardDeck.creator_id == user_id,
            FlashcardDeck.id.in_(attempt_sub),
            FlashcardDeck.id.in_(collab_sub)
        )
    )
    deck_res = await db.execute(deck_stmt)
    decks = deck_res.scalars().all()
    
    if not decks:
        # Load active public decks if user has no decks
        public_deck_stmt = select(FlashcardDeck).where(FlashcardDeck.is_public == True).limit(5)
        public_deck_res = await db.execute(public_deck_stmt)
        decks = public_deck_res.scalars().all()
        
    deck_ids = [d.id for d in decks]
    if not deck_ids:
        return {
            "id": 0,
            "title": "Học Nhanh (Quick Play)",
            "description": "Tự động ôn tập các thẻ đến hạn và học mới ngẫu nhiên từ tất cả các bộ bài của bạn.",
            "cards": [],
            "questions": [],
            "user_total_xp": 0,
            "user_today_xp": 0,
            "user_today_time": 0,
            "user_all_time_time": 0
        }
        
    # 2. Fetch all cards of these decks
    from app.modules.deck.models import Flashcard
    card_stmt = select(Flashcard).where(Flashcard.deck_id.in_(deck_ids))
    card_res = await db.execute(card_stmt)
    cards = card_res.scalars().all()
    
    if not cards:
        return {
            "id": 0,
            "title": "Học Nhanh (Quick Play)",
            "description": "Tự động ôn tập các thẻ đến hạn và học mới ngẫu nhiên từ tất cả các bộ bài của bạn.",
            "cards": [],
            "questions": [],
            "user_total_xp": 0,
            "user_today_xp": 0,
            "user_today_time": 0,
            "user_all_time_time": 0
        }
        
    # 3. Load user card mastery
    from app.modules.deck.models import UserCardMastery
    mastery_stmt = select(UserCardMastery).where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.card_id.in_([c.id for c in cards])
    )
    mastery_res = await db.execute(mastery_stmt)
    mastery_records = {m.card_id: m for m in mastery_res.scalars().all()}
    
    # 4. Group into due and new
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    due_cards = []
    new_cards = []
    
    for c in cards:
        m = mastery_records.get(c.id)
        if m:
            if m.is_ignored:
                continue
            if m.state == 0 and m.last_review is None:
                new_cards.append(c)
            else:
                m_due = m.due.replace(tzinfo=timezone.utc) if m.due else now_utc
                if m_due <= now_utc:
                    due_cards.append((c, m))
        else:
            new_cards.append(c)
            
    import random
    selected_items = []
    if due_cards:
        random.shuffle(due_cards)
        selected_items = due_cards[:100]
    else:
        random.shuffle(new_cards)
        selected_items = [(c, None) for c in new_cards[:30]]
        
    # 5. Fetch review times
    from app.modules.deck.models import UserAnswer
    selected_card_ids = [item[0].id for item in selected_items]
    
    review_times_stmt = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at),
        func.max(UserAnswer.created_at)
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         UserAnswer.card_id.in_(selected_card_ids)
     ).group_by(UserAnswer.card_id)
     
    review_times_res = await db.execute(review_times_stmt)
    review_times_map = {row[0]: (row[1], row[2]) for row in review_times_res.all()}
    
    # 6. Fetch XP directly — no streak update cascade on card load
    from app.modules.gamification.models import UserGamification
    user_xp_res = await db.execute(select(UserGamification.xp).where(UserGamification.user_id == user_id))
    user_total_xp = user_xp_res.scalar() or 0
    
    from app.modules.gamification.models import XPTransaction
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_xp_stmt = select(func.sum(XPTransaction.amount)).where(
        XPTransaction.user_id == user_id,
        XPTransaction.created_at >= today_start
    )
    today_time_stmt = select(func.sum(UserAnswer.active_time)).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id,
        UserAnswer.created_at >= today_start
    )
    
    today_xp_res = await db.execute(today_xp_stmt)
    today_time_res = await db.execute(today_time_stmt)
    
    user_today_xp = today_xp_res.scalar() or 0
    user_today_time = today_time_res.scalar() or 0
    user_all_time_time = user_today_time  # All-time deferred to dashboard
    
    default_new_intervals = {1: "1m", 2: "5m", 3: "10m", 4: "4d"}
    
    cards_list = []
    for c, m in selected_items:
        m_state = m.state if m else 0
        m_stability = m.stability if m else None
        m_difficulty = m.difficulty if m else None
        m_due = m.due if m else datetime.utcnow()
        m_last_review = m.last_review if m else None
        m_box_level = m.box_level if m else 1
        
        is_new = (m is None) or (m_state == 0 and m_last_review is None)
        if is_new:
            intervals = default_new_intervals
        elif m_stability and m_stability > 0:
            hard_days = max(1, round(m_stability * 1.2))
            good_days = max(2, round(m_stability * 2.5))
            easy_days = max(4, round(m_stability * 4.0))
            intervals = {1: "10m", 2: f"{hard_days}d", 3: f"{good_days}d", 4: f"{easy_days}d"}
        else:
            intervals = default_new_intervals
            
        r_times = review_times_map.get(c.id)
        first_learned = r_times[0] if r_times else None
        last_reviewed = r_times[1] if r_times else None
        
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "explanation": c.explanation,
            "front_audio_content": c.front_audio_content,
            "back_audio_content": c.back_audio_content,
            "front_audio_url": c.front_audio_url,
            "back_audio_url": c.back_audio_url,
            "front_img": c.front_img,
            "back_img": c.back_img,
            "stats": getattr(c, 'stats', None),
            "box_level": m_box_level,
            "is_ignored": m.is_ignored if m else False,
            "is_starred": m.is_starred if m else False,
            "fsrs": {
                "state": m_state,
                "stability": m_stability,
                "difficulty": m_difficulty,
                "due": m_due.isoformat() if m_due else None,
                "last_review": m_last_review.isoformat() if m_last_review else None,
                "first_learned": first_learned.isoformat() if first_learned else None,
                "last_reviewed": last_reviewed.isoformat() if last_reviewed else None,
                "intervals": intervals
            },
            "options": [],
            "image": fix_static_urls(c.back_img),
            "audio": fix_static_urls(c.front_audio_url),
            "others": fix_static_urls(c.others)
        })
        
    await resolve_play_cards(cards_list, db)
    return {
        "id": 0,
        "title": "Học Nhanh (Quick Play)",
        "description": "Tự động ôn tập các thẻ đến hạn và học mới ngẫu nhiên từ tất cả các bộ bài của bạn.",
        "ai_prompts": [],
        "instruction": "",
        "category_id": 0,
        "creator_id": 0,
        "is_collaborator": False,
        "user_total_xp": user_total_xp,
        "user_today_xp": user_today_xp,
        "user_today_time": user_today_time,
        "user_all_time_time": user_all_time_time,
        "practice_needs_setup": False,
        "practice_disabled": False,
        "questions": cards_list
    }

@router.get("/{deck_id}/play-data")
async def get_deck_play_data(
    request: Request,
    deck_id: int,
    mode: Optional[str] = None,
    scope: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0),
    lightweight: Optional[bool] = None,
    sub_col: Optional[str] = Query(None),
    sub_val: Optional[str] = Query(None),
    include_distractors: Optional[bool] = Query(None),
    include_map_skeleton: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    
    from app.modules.deck.models import (
        FlashcardDeck, Flashcard, Tag, DeckCollaborator, UserCardMastery, UserDeckSettings
    )
    from app.modules.auth.models import User as UserDB
    from app.modules.gamification.models import XPTransaction, UserGamification
    from app.modules.deck.models import UserAnswer, DeckAttempt

    # 1. Fetch deck with tags (skip selectinload on cards to avoid heavy relationship overhead)
    deck_query = select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(
        selectinload(FlashcardDeck.tags)
    )
    deck_res = await db.execute(deck_query)
    deck = deck_res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})

    # Fetch cards directly in single indexed query (10x faster and 80% less memory than selectinload)
    card_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id).order_by(Flashcard.id.asc())
    card_res = await db.execute(card_stmt)
    deck_cards = list(card_res.scalars().all())
    deck.__dict__["cards"] = deck_cards
    deck.cards = deck_cards

    is_collaborator = False
    is_admin = False
    if user_id:
        collab_res = await db.execute(
            select(DeckCollaborator).where(
                DeckCollaborator.deck_id == deck_id,
                DeckCollaborator.user_id == user_id
            )
        )
        is_collaborator = collab_res.scalar() is not None
        user_res = await db.execute(select(UserDB.role).where(UserDB.id == user_id))
        user_role = user_res.scalar_one_or_none()
        is_admin = (user_role == "admin")

    if not deck.is_public and deck.creator_id != user_id and user_id != 1 and not is_collaborator and not is_admin:
        return JSONResponse(status_code=403, content={"error": "This is a private deck"})

    if lightweight:
        source_cards = deck_cards
        if sub_col and sub_val is not None:
            def matches_sub_light(c):
                val = ""
                if c.others and isinstance(c.others, dict):
                    val = str(c.others.get(sub_col, "") or "").strip()
                elif hasattr(c, sub_col):
                    val = str(getattr(c, sub_col) or "").strip()
                if sub_val == "__empty__":
                    return not val
                clean_sub = sub_val.strip() if hasattr(sub_val, "strip") else str(sub_val or "").strip()
            return val == clean_sub
            source_cards = [c for c in source_cards if matches_sub_light(c)]

        cards_list = [{
            "id": c.id,
            "original_index": i + 1,
            "content": c.content,
            "explanation": c.explanation,
            "front_audio_content": c.front_audio_content,
            "back_audio_content": c.back_audio_content,
            "front_audio_url": c.front_audio_url,
            "back_audio_url": c.back_audio_url,
            "front_img": c.front_img,
            "back_img": c.back_img,
            "image": fix_static_urls(c.back_img),
            "audio": fix_static_urls(c.front_audio_url),
            "others": fix_static_urls(c.others)
        } for i, c in enumerate(source_cards)]
        
        await resolve_play_cards(cards_list, db)
        return {
            "id": deck.id,
            "title": deck.title,
            "description": deck.description,
            "cover_image": fix_static_urls(deck.cover_image),
            "tags": [t.name for t in deck.tags] if deck.tags else [],
            "ai_prompts": deck.practice_settings.get("ai_prompts", []) if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else [],
            "instruction": deck.instruction,
            "category_id": deck.category_id,
            "creator_id": deck.creator_id,
                "questions": cards_list,
            "sub_group": {
                "column": sub_col,
                "value": sub_val,
                "total_cards": len(cards_list)
            } if sub_col and sub_val is not None else None
        }

    is_practice = mode in ("mcq", "typing", "listening")

    user_sett = None
    user_total_xp = 0
    user_today_xp = 0
    user_today_time = 0
    user_all_time_time = 0

    if user_id:
        # Only fetch user deck settings — critical for card filtering/display
        user_sett_stmt = select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
        user_sett_res = await db.execute(user_sett_stmt)
        user_sett = user_sett_res.scalar_one_or_none()

        # XP/time stats are deferred — frontend uses Zustand store values
        # and refreshes them lazily from /api/v1/gamification/stats
        user_xp_stmt = select(UserGamification.xp).where(UserGamification.user_id == user_id)
        user_xp_res = await db.execute(user_xp_stmt)
        user_total_xp = user_xp_res.scalar() or 0

    source_cards = deck_cards
    if sub_col and sub_val is not None:
        def matches_sub(c):
            val = ""
            if c.others and isinstance(c.others, dict):
                val = str(c.others.get(sub_col, "") or "").strip()
            elif hasattr(c, sub_col):
                val = str(getattr(c, sub_col) or "").strip()
            if sub_val == "__empty__":
                return not val
            clean_sub = sub_val.strip() if hasattr(sub_val, "strip") else str(sub_val or "").strip()
            return val == clean_sub
        source_cards = [c for c in source_cards if matches_sub(c)]

    # 3. Fetch Mastery records and Practice stats in 1 indexed query (Skip for practice mode)
    mastery_records = {}
    practice_records = {}
    if not is_practice and user_id and source_cards:
        card_ids = [c.id for c in source_cards]
        mastery_stmt = select(UserCardMastery).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id.in_(card_ids)
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_records = {m.card_id: m for m in mastery_res.scalars().all()}

        # Server-side Scope Filtering & Slicing for fast mobile loading
        if scope in ("due", "review"):
            now_utc_naive = datetime.utcnow()
            def is_card_due(c):
                m = mastery_records.get(c.id)
                if not m or m.is_ignored:
                    return False
                if m.state == 0 and not m.last_review:
                    return False
                if m.due:
                    return m.due <= now_utc_naive
                return m.state > 0
            source_cards = [c for c in source_cards if is_card_due(c)]
        elif scope == "new":
            def is_card_new(c):
                m = mastery_records.get(c.id)
                if m and m.is_ignored:
                    return False
                return (m is None) or (m.state == 0 and m.last_review is None)
            source_cards = [c for c in source_cards if is_card_new(c)]
        elif scope == "hard":
            def is_card_hard(c):
                m = mastery_records.get(c.id)
                if not m or m.is_ignored:
                    return False
                return (m.difficulty and m.difficulty >= 6.0) or (m.lapses and m.lapses > 0) or m.is_starred
            source_cards = [c for c in source_cards if is_card_hard(c)]

    now_utc_naive = datetime.utcnow()
    # Compute live scope counts across deck
    scope_counts = None
    if mastery_records:
        new_cnt = sum(1 for c in (deck_cards) if (mastery_records.get(c.id) is None or (mastery_records.get(c.id).state == 0 and mastery_records.get(c.id).last_review is None)))
        due_cnt = sum(1 for c in (deck_cards) if (mastery_records.get(c.id) and mastery_records.get(c.id).due and mastery_records.get(c.id).due <= now_utc_naive))
        rev_cnt = sum(1 for c in (deck_cards) if (mastery_records.get(c.id) and mastery_records.get(c.id).state > 0))
        undrilled_cnt = sum(1 for c in (deck_cards) if (mastery_records.get(c.id) is None or mastery_records.get(c.id).state < 2))
        scope_counts = {
            "all": len(deck_cards),
            "new": new_cnt,
            "due": due_cnt,
            "review": rev_cnt,
            "undrilled": undrilled_cnt
        }

    # Generate lightweight distractor pool across entire deck if practice, hybrid, or requested
    distractor_pool = []
    if is_practice or mode in ("mcq", "listening", "hybrid", "drill") or include_distractors:
        all_deck_cards = deck_cards
        import random
        sample_size = min(len(all_deck_cards), 70)
        sampled_cands = random.sample(all_deck_cards, sample_size) if len(all_deck_cards) > sample_size else all_deck_cards
        for sc in sampled_cands:
            sc_others = sc.others if isinstance(sc.others, dict) else {}
            distractor_pool.append({
                "id": sc.id,
                "front": sc.content,
                "back": sc.explanation,
                "others": {
                    "type": sc_others.get("type", "") or sc_others.get("pos", ""),
                    "pos": sc_others.get("pos", "")
                } if sc_others else None
            })

    total_matching = len(source_cards)

    # Optional map skeleton (only IDs and status markers for high-speed map modal)
    map_skeleton = None
    if include_map_skeleton:
        map_skeleton = []
        for idx, sc in enumerate(source_cards):
            m_sc = mastery_records.get(sc.id) if mastery_records else None
            map_skeleton.append({
                "id": sc.id,
                "original_index": idx + 1,
                "state": m_sc.state if m_sc else 0,
                "is_due": bool(m_sc and m_sc.due and m_sc.due <= now_utc_naive),
                "is_starred": bool(m_sc and m_sc.is_starred)
            })

    # Apply batch slicing / pagination across all study and practice modes
    start_offset = max(0, offset or 0)
    if limit and limit > 0:
        source_cards = source_cards[start_offset : start_offset + limit]

    active_card_ids = [c.id for c in source_cards]
    if active_card_ids and not is_practice:
        from app.modules.deck.models import UserPracticeStats
        p_stats_stmt = select(UserPracticeStats).where(
            UserPracticeStats.user_id == user_id,
            UserPracticeStats.card_id.in_(active_card_ids)
        )
        p_stats_res = await db.execute(p_stats_stmt)
        for ps in p_stats_res.scalars().all():
            if ps.card_id not in practice_records:
                practice_records[ps.card_id] = []
            practice_records[ps.card_id].append(ps)

    # Check settings if practice mode
    practice_needs_setup = False
    practice_disabled = False
    active_pairs = []
    num_choices = 4
    
    if is_practice:
        raw_settings = deck.practice_settings
        settings = migrate_practice_settings(raw_settings)
        mode_settings = settings.get(mode, {})
        
        if not mode_settings or not mode_settings.get("active_pairs"):
            creator_settings = migrate_practice_settings(deck.practice_settings)
            creator_mode_settings = creator_settings.get(mode, {})
            
            creator_has_settings = creator_mode_settings and creator_mode_settings.get("active_pairs")
            if not creator_has_settings:
                is_owner = deck.creator_id == user_id
                if not (is_owner or is_collaborator or user_id == 1):
                    practice_disabled = True
                else:
                    practice_needs_setup = True
            else:
                active_pairs = creator_mode_settings.get("active_pairs", [])
                num_choices = creator_mode_settings.get("num_choices", 4)
        else:
            active_pairs = mode_settings.get("active_pairs", [])
            num_choices = mode_settings.get("num_choices", 4)

    cards_list = []
    
    if is_practice:
        # Ultra-fast path for practice: just card data, no FSRS computation
        for i, c in enumerate(source_cards):
            cards_list.append({
                "id": c.id,
                "original_index": i + 1,
                "content": c.content,
                "explanation": c.explanation,
                "ai_explanation": c.others.get("ai_explanation") if c.others else None,
                "hint": c.others.get("hint") if c.others else None,
                "mnemonic": c.others.get("mnemonic") if c.others else None,
                "stats": None,
                "box_level": 1,
                "is_ignored": False,
                "is_starred": False,
                "fsrs": None,
                "options": [],
                "image": fix_static_urls(c.back_img),
                "audio": fix_static_urls(c.front_audio_url),
                "others": fix_static_urls(c.others)
            })
    else:
        # Predefined static default intervals for new cards (Zero CPU cost)
        default_new_intervals = {"1": "1m", "2": "5m", "3": "10m", "4": "4d"}
        
        for idx, c in enumerate(source_cards):
            m = mastery_records.get(c.id)
            
            m_state = m.state if m else 0
            m_step = m.step if m else 0
            m_stability = m.stability if m else None
            m_difficulty = m.difficulty if m else None
            m_due = m.due if m else datetime.utcnow()
            m_last_review = m.last_review if m else None
            m_box_level = m.box_level if m else 1
            
            is_new = (m is None) or (m_state == 0 and m_last_review is None)
            
            if is_new:
                intervals = default_new_intervals
            elif m_stability and m_stability > 0:
                hard_days = max(1, round(m_stability * 1.2))
                good_days = max(2, round(m_stability * 2.5))
                easy_days = max(4, round(m_stability * 4.0))
                intervals = {
                    "1": "10m",
                    "2": f"{hard_days}d",
                    "3": f"{good_days}d",
                    "4": f"{easy_days}d"
                }
            else:
                intervals = default_new_intervals
                        
            card_p_stats = practice_records.get(c.id)
            if card_p_stats:
                total_attempts = sum((ps.correct_count or 0) + (ps.wrong_count or 0) for ps in card_p_stats)
                drill_correct = sum((ps.correct_count or 0) for ps in card_p_stats if ps.practice_mode == "hybrid_drill")
                p_dates = [ps.last_practiced for ps in card_p_stats if ps.last_practiced]
                last_practiced_dt = max(p_dates) if p_dates else None
                practice_summary = {
                    "total_attempts": total_attempts,
                    "drill_correct": drill_correct,
                    "last_practiced": last_practiced_dt.isoformat() if last_practiced_dt else None
                }
            else:
                practice_summary = None

            cards_list.append({
                "id": c.id,
                "original_index": idx + 1,
                "content": c.content,
                "explanation": c.explanation,
                "front_audio_content": c.front_audio_content,
                "back_audio_content": c.back_audio_content,
                "front_audio_url": c.front_audio_url,
                "back_audio_url": c.back_audio_url,
                "front_img": c.front_img,
                "back_img": c.back_img,
                "practice_summary": practice_summary,
                "stats": {
                    "total": m.consecutive_correct if m else 0,
                    "correct": m.consecutive_correct if m else 0,
                    "last_answered": m.last_answered.isoformat() if (m and m.last_answered) else None
                } if m else None,
                "box_level": m_box_level,
                "is_ignored": m.is_ignored if m else False,
                "is_starred": m.is_starred if m else False,
                "fsrs": {
                    "state": m_state,
                    "stability": m_stability,
                    "difficulty": m_difficulty,
                    "due": m_due.isoformat() if m_due else None,
                    "last_review": m_last_review.isoformat() if m_last_review else None,
                    "first_learned": m.last_answered.isoformat() if (m and m.state > 0 and m.last_answered) else None,
                    "last_reviewed": m_last_review.isoformat() if m_last_review else None,
                    "intervals": intervals
                },
                "options": [],
                "image": fix_static_urls(c.back_img),
                "audio": fix_static_urls(c.front_audio_url),
                "others": fix_static_urls(c.others)
            })
        
    if user_id:
        user_global_sett_obj = await UserSettingsService.get_or_create_settings(db, user_id)
        user_global_sett_dict = UserSettingsService.to_dict(user_global_sett_obj)
    else:
        user_global_sett_dict = {}

    study_resolved = resolve_effective_study_settings(
        deck.practice_settings,
        user_sett.settings if user_sett else None,
        user_global_sett_dict
    )

    await resolve_play_cards(cards_list, db)
    final_result = {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "ai_prompts": deck.practice_settings.get("ai_prompts", []) if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else [],
        "instruction": deck.instruction,
        "category_id": deck.category_id,
        "creator_id": deck.creator_id,
        "is_collaborator": is_collaborator,
        "user_total_xp": user_total_xp,
        "user_today_xp": user_today_xp,
        "user_today_time": user_today_time,
        "user_all_time_time": user_all_time_time,
        "enabled_practice_modes": get_enabled_practice_modes(deck.practice_settings),
        "has_practice_setup": check_has_practice_setup(deck.practice_settings),
        "has_mcq_setup": check_has_mcq_setup(deck.practice_settings),
        "practice_needs_setup": practice_needs_setup,
        "practice_disabled": not check_has_practice_setup(deck.practice_settings),
        "total_cards": total_matching,
        "questions": cards_list, # compatibility
        "distractor_pool": distractor_pool,
        "map_skeleton": map_skeleton,
        "scope_counts": scope_counts,
        "pagination": {
            "total": total_matching,
            "offset": start_offset,
            "limit": limit,
            "has_more": (start_offset + len(cards_list)) < total_matching if limit else False,
            "next_offset": (start_offset + len(cards_list)) if (limit and ((start_offset + len(cards_list)) < total_matching)) else None
        } if limit else None,
        "practice_settings": deck.practice_settings,
        "user_settings": user_sett.settings if user_sett else None,
        "study_defaults": study_resolved["creator_study_defaults"],
        "creator_study_defaults": study_resolved["creator_study_defaults"],
        "user_study_settings": study_resolved["user_study_settings"],
        "user_global_settings": study_resolved["user_global_settings"],
        "study_profiles": study_resolved["study_profiles"],
        "active_profile_id": study_resolved["active_profile_id"],
        "effective_study_settings": study_resolved["effective_study_settings"],
        "setting_origin": study_resolved["setting_origin"],
        "is_study_customized": study_resolved["is_customized"],
        "sub_group": {
            "column": sub_col,
            "value": sub_val,
            "total_cards": len(cards_list)
        } if sub_col and sub_val is not None else None
    }

    try:
        import orjson
        content_bytes = orjson.dumps(final_result, option=orjson.OPT_NON_STR_KEYS)
        return Response(content=content_bytes, media_type="application/json")
    except Exception as e:
        logger.warning(f"orjson dump fallback in play_data: {e}")
        return final_result


