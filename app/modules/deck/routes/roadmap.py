import logging
import json
import random
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Request, Query, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete, case
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.deck.services.deck_service import DeckService
from app.modules.deck.models import (
    FlashcardDeck, Flashcard, UserCardMastery, UserAnswer, 
    DeckAttempt, UserDeckGoal, UserDailyProgress, DeckSession, 
    UserDeckSettings, RoadmapPipelineHistory, UserPracticeStats
)
from app.modules.deck.utils import fix_static_urls, migrate_practice_settings, extract_card_val, extract_card_answers

logger = logging.getLogger(__name__)

router = APIRouter(tags=['Roadmap'])




@router.get("/roadmap/decks")
async def get_roadmap_decks(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    # STRICT: Only show decks where user has EXPLICITLY set roadmap_active=True in their UserDeckSettings
    user_setts_res = await db.execute(
        select(UserDeckSettings).where(UserDeckSettings.user_id == user_id)
    )
    
    active_roadmaps = []
    active_deck_ids = []
    user_setts_map = {}
    
    for sett in user_setts_res.scalars().all():
        s = sett.settings or {}
        user_setts_map[sett.deck_id] = s
        # Only include if roadmap_active is EXPLICITLY True — no fallbacks
        if s.get("roadmap_active") is True:
            active_deck_ids.append(sett.deck_id)
    
    if active_deck_ids:
        decks_res = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id.in_(active_deck_ids))
        )
        decks = decks_res.scalars().all()
        
        from .media_resolver import get_sso_server_url, resolve_central_url
        sso_url = await get_sso_server_url(db)

        # UTC+0 Day boundaries (Rule 11)
        now_utc = datetime.now(timezone.utc)
        day_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
        day_end = day_start + timedelta(days=1) - timedelta(microseconds=1)

        # Batch Query 1: Total cards per deck
        total_cards_res = await db.execute(
            select(Flashcard.deck_id, func.count(Flashcard.id))
            .where(Flashcard.deck_id.in_(active_deck_ids))
            .group_by(Flashcard.deck_id)
        )
        total_map = {row[0]: row[1] for row in total_cards_res.all()}

        # Batch Query 2: Reviewed cards in FSRS (last_review is not None & state > 0)
        reviewed_card_sub = (
            select(UserCardMastery.card_id)
            .where(
                UserCardMastery.user_id == user_id,
                UserCardMastery.state > 0,
                UserCardMastery.last_review.isnot(None),
                UserCardMastery.card_id.isnot(None)
            )
        )
        reviewed_res = await db.execute(
            select(Flashcard.deck_id, func.count(UserCardMastery.id))
            .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id.in_(active_deck_ids),
                UserCardMastery.user_id == user_id,
                UserCardMastery.state > 0,
                UserCardMastery.last_review.isnot(None),
                or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
            )
            .group_by(Flashcard.deck_id)
        )
        reviewed_map = {row[0]: row[1] for row in reviewed_res.all()}

        # Batch Query 3: Due Recall today (Rule 11: due <= day_end, exclude reviewed today)
        due_res = await db.execute(
            select(Flashcard.deck_id, func.count(UserCardMastery.id))
            .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id.in_(active_deck_ids),
                UserCardMastery.user_id == user_id,
                UserCardMastery.state > 0,
                UserCardMastery.last_review.isnot(None),
                UserCardMastery.due <= day_end,
                or_(UserCardMastery.last_review.is_(None), UserCardMastery.last_review < day_start),
                or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
            )
            .group_by(Flashcard.deck_id)
        )
        due_recall_map = {row[0]: row[1] for row in due_res.all()}

        # Batch Query 4: Streak counts
        goals_res = await db.execute(
            select(UserDeckGoal.deck_id, UserDeckGoal.streak_count)
            .where(
                UserDeckGoal.user_id == user_id,
                UserDeckGoal.deck_id.in_(active_deck_ids)
            )
        )
        streak_map = {row[0]: (row[1] or 0) for row in goals_res.all()}

        # Batch Query 5: Reinforced cards (Hybrid Recall: practice_mode == 'hybrid_drill', not reviewed)
        hybrid_card_sub = (
            select(UserPracticeStats.card_id)
            .where(
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.practice_mode == 'hybrid_drill',
                UserPracticeStats.card_id.isnot(None)
            )
        )
        reinforced_res = await db.execute(
            select(Flashcard.deck_id, func.count(func.distinct(Flashcard.id)))
            .join(UserPracticeStats, UserPracticeStats.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id.in_(active_deck_ids),
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.practice_mode == 'hybrid_drill',
                Flashcard.id.not_in(reviewed_card_sub)
            )
            .group_by(Flashcard.deck_id)
        )
        reinforced_map = {row[0]: row[1] for row in reinforced_res.all()}

        # Batch Query 6: Practiced cards (Quiz: practice_mode != 'hybrid_drill', not reviewed, not hybrid)
        practiced_res = await db.execute(
            select(Flashcard.deck_id, func.count(func.distinct(Flashcard.id)))
            .join(UserPracticeStats, UserPracticeStats.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id.in_(active_deck_ids),
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.practice_mode != 'hybrid_drill',
                Flashcard.id.not_in(reviewed_card_sub),
                Flashcard.id.not_in(hybrid_card_sub)
            )
            .group_by(Flashcard.deck_id)
        )
        practiced_map = {row[0]: row[1] for row in practiced_res.all()}

        # Batch Query 7: Previewed cards (Speed Skim: not reviewed, not hybrid, not practiced)
        any_practice_sub = (
            select(UserPracticeStats.card_id)
            .where(
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.card_id.isnot(None)
            )
        )
        skim_sub = (
            select(UserAnswer.card_id)
            .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
            .where(
                DeckAttempt.user_id == user_id,
                DeckAttempt.mode.in_(["speed_skim", "skim", "flip"]),
                UserAnswer.card_id.isnot(None)
            )
        )
        previewed_res = await db.execute(
            select(Flashcard.deck_id, func.count(func.distinct(Flashcard.id)))
            .outerjoin(UserCardMastery, and_(UserCardMastery.card_id == Flashcard.id, UserCardMastery.user_id == user_id))
            .where(
                Flashcard.deck_id.in_(active_deck_ids),
                or_(
                    UserCardMastery.last_answered.isnot(None),
                    Flashcard.id.in_(skim_sub)
                ),
                Flashcard.id.not_in(reviewed_card_sub),
                Flashcard.id.not_in(any_practice_sub)
            )
            .group_by(Flashcard.deck_id)
        )
        previewed_map = {row[0]: row[1] for row in previewed_res.all()}

        for deck in decks:
            u_sett = user_setts_map.get(deck.id, {})
            creator_sett = deck.practice_settings if isinstance(deck.practice_settings, dict) else {}
            
            is_frozen = bool(u_sett.get("is_frozen", False))
            disabled_modes = []
            if isinstance(creator_sett.get("disabled_modes"), list):
                disabled_modes.extend(creator_sett["disabled_modes"])
            if isinstance(u_sett.get("disabled_modes"), list):
                disabled_modes.extend(u_sett["disabled_modes"])
            disabled_modes = list(set(disabled_modes))

            practice_modes_set = {"mcq", "typing", "listening_mcq", "listening_typing"}
            is_practice_disabled = (
                "practice" in disabled_modes or
                "all_practice" in disabled_modes or
                practice_modes_set.issubset(set(disabled_modes)) or
                ({"mcq", "typing"}.issubset(set(disabled_modes)))
            )

            total_cnt = total_map.get(deck.id, 0)
            reviewed_cnt = reviewed_map.get(deck.id, 0)
            due_recall_cnt = due_recall_map.get(deck.id, 0)
            retained_cnt = max(0, reviewed_cnt - due_recall_cnt)

            reinforced_cnt = reinforced_map.get(deck.id, 0)
            practiced_cnt = practiced_map.get(deck.id, 0)
            previewed_cnt = previewed_map.get(deck.id, 0)
            fresh_cnt = max(0, total_cnt - (reviewed_cnt + reinforced_cnt + practiced_cnt + previewed_cnt))
            deck_streak = streak_map.get(deck.id, 0)

            status = {
                "total_cards": total_cnt,
                # Option 2 (Action-Oriented) Unified Lifecycle:
                "fresh_count": fresh_cnt,
                "previewed_count": previewed_cnt,
                "practiced_count": practiced_cnt,
                "reinforced_count": reinforced_cnt,
                "retained_count": retained_cnt,
                "due_recall_count": due_recall_cnt,
                # Legacy / Backwards-compatible aliases:
                "learned_cards": reviewed_cnt,
                "unlearned_cards": max(0, total_cnt - reviewed_cnt),
                "review_due_today": due_recall_cnt,
                "waiting_review_count": retained_cnt,
                "streak": deck_streak,
                "is_frozen": is_frozen,
                "disabled_modes": disabled_modes,
                "is_practice_disabled": is_practice_disabled,
                "retention_rate": 90,
            }

            cover_image = resolve_central_url(deck.cover_image, sso_url) if deck.cover_image else None
            active_roadmaps.append({
                "deck_id": deck.id,
                "title": deck.title,
                "description": deck.description,
                "cover_image": cover_image,
                "is_frozen": is_frozen,
                "practice_settings": deck.practice_settings or {},
                "disabled_modes": disabled_modes,
                "is_practice_disabled": is_practice_disabled,
                "status": status
            })

    return {"decks": active_roadmaps}


@router.post("/{deck_id}/toggle-freeze")
async def toggle_deck_freeze(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle freezing a deck so its cards are paused from daily review & global focus queue."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    from sqlalchemy.orm.attributes import flag_modified
    from app.modules.deck.models import UserDeckSettings, UserDeckGoal

    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_sett = user_sett_res.scalar_one_or_none()
    if not user_sett:
        user_sett = UserDeckSettings(user_id=user_id, deck_id=deck_id, settings={})
        db.add(user_sett)
    elif not isinstance(user_sett.settings, dict):
        user_sett.settings = {}

    curr_frozen = bool(user_sett.settings.get("is_frozen", False))
    new_frozen = not curr_frozen

    user_sett.settings["is_frozen"] = new_frozen
    user_sett.settings["frozen_at"] = datetime.utcnow().isoformat() if new_frozen else None
    flag_modified(user_sett, "settings")

    # Sync UserDeckGoal status: "paused" when frozen, "active" when unfrozen
    goal_res = await db.execute(
        select(UserDeckGoal).where(
            UserDeckGoal.user_id == user_id,
            UserDeckGoal.deck_id == deck_id
        )
    )
    goal = goal_res.scalar_one_or_none()
    if goal:
        goal.status = "paused" if new_frozen else "active"

    await db.commit()

    return {
        "status": "ok",
        "deck_id": deck_id,
        "is_frozen": new_frozen,
        "frozen_at": user_sett.settings.get("frozen_at")
    }


@router.get("/global-focus/summary")
async def get_global_focus_summary(request: Request, db: AsyncSession = Depends(get_db)):
    """Aggregate all due FSRS review cards across active, unfrozen decks for today (UTC+0)."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    from app.modules.deck.models import FlashcardDeck, Flashcard, UserCardMastery, UserDeckSettings, UserAnswer, DeckAttempt

    now_utc = datetime.utcnow()
    day_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    # 1. Fetch user deck settings to separate frozen from active
    sett_res = await db.execute(
        select(UserDeckSettings).where(UserDeckSettings.user_id == user_id)
    )
    all_setts = sett_res.scalars().all()
    frozen_deck_ids = set()
    roadmap_active_deck_ids = set()

    for s in all_setts:
        sett_dict = s.settings or {}
        if sett_dict.get("is_frozen") is True:
            frozen_deck_ids.add(s.deck_id)
        if sett_dict.get("roadmap_active") is True:
            roadmap_active_deck_ids.add(s.deck_id)

    # 2. Get decks the user has learned cards in
    interacted_res = await db.execute(
        select(Flashcard.deck_id)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .where(UserCardMastery.user_id == user_id, UserCardMastery.state > 0)
        .distinct()
    )
    interacted_deck_ids = {r[0] for r in interacted_res.all()}

    # 3. Identify user's archived decks (DeckAttempt.is_archived == True)
    archived_res = await db.execute(
        select(DeckAttempt.deck_id)
        .where(DeckAttempt.user_id == user_id)
        .group_by(DeckAttempt.deck_id)
        .having(func.max(case((DeckAttempt.is_archived == True, 1), else_=0)) == 1)
    )
    archived_deck_ids = {r[0] for r in archived_res.all()}

    all_user_deck_ids = (roadmap_active_deck_ids | interacted_deck_ids)
    active_deck_ids = (all_user_deck_ids - frozen_deck_ids) - archived_deck_ids

    if not active_deck_ids:
        return {
            "total_due": 0,
            "active_decks_count": 0,
            "frozen_decks_count": len(frozen_deck_ids),
            "decks": []
        }

    # Subquery: exclude cards learned today
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review", "speed_skim"])
     )\
     .group_by(UserAnswer.card_id).subquery()

    # Query due counts per deck following Invariant Quota rules (UTC+0)
    due_stmt = (
        select(
            FlashcardDeck.id.label("deck_id"),
            FlashcardDeck.title.label("deck_title"),
            FlashcardDeck.cover_image.label("cover_image"),
            func.count(UserCardMastery.id).label("due_count")
        )
        .join(Flashcard, FlashcardDeck.id == Flashcard.deck_id)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .outerjoin(min_answer_sub, UserCardMastery.card_id == min_answer_sub.c.card_id)
        .where(
            FlashcardDeck.id.in_(active_deck_ids),
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None)),
            UserCardMastery.due <= day_end,
            or_(
                min_answer_sub.c.min_created == None,
                min_answer_sub.c.min_created < day_start
            ),
            or_(
                UserCardMastery.last_review == None,
                UserCardMastery.last_review < day_start
            )
        )
        .group_by(FlashcardDeck.id, FlashcardDeck.title, FlashcardDeck.cover_image)
        .order_by(func.count(UserCardMastery.id).desc())
    )

    res = await db.execute(due_stmt)
    rows = res.all()

    from .media_resolver import get_sso_server_url, resolve_central_url
    sso_url = await get_sso_server_url(db)

    decks_summary = []
    total_due = 0
    for r in rows:
        total_due += r.due_count
        decks_summary.append({
            "deck_id": r.deck_id,
            "title": r.deck_title,
            "cover_image": resolve_central_url(r.cover_image, sso_url) if r.cover_image else None,
            "due_count": r.due_count
        })

    return {
        "total_due": total_due,
        "active_decks_count": len(decks_summary),
        "frozen_decks_count": len(frozen_deck_ids),
        "decks": decks_summary
    }


@router.get("/global-focus/play-data")
async def get_global_focus_play_data(
    request: Request,
    limit: int = Query(500, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve consolidated FSRS study cards across all active unfrozen decks for today (UTC+0), automatically shuffled."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    from app.modules.deck.models import FlashcardDeck, Flashcard, UserCardMastery, UserDeckSettings, UserAnswer, DeckAttempt
    from app.modules.deck.routes.play import resolve_play_cards

    now_utc = datetime.utcnow()
    day_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    # 1. Fetch user deck settings to separate frozen from active
    sett_res = await db.execute(
        select(UserDeckSettings).where(UserDeckSettings.user_id == user_id)
    )
    all_setts = sett_res.scalars().all()
    frozen_deck_ids = set()
    roadmap_active_deck_ids = set()
    for s in all_setts:
        sett_dict = s.settings or {}
        if sett_dict.get("is_frozen") is True:
            frozen_deck_ids.add(s.deck_id)
        if sett_dict.get("roadmap_active") is True:
            roadmap_active_deck_ids.add(s.deck_id)

    # 2. Decks the user has learned cards in
    interacted_res = await db.execute(
        select(Flashcard.deck_id)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .where(UserCardMastery.user_id == user_id, UserCardMastery.state > 0)
        .distinct()
    )
    interacted_deck_ids = {r[0] for r in interacted_res.all()}

    # 3. Identify user's archived decks (DeckAttempt.is_archived == True)
    archived_res = await db.execute(
        select(DeckAttempt.deck_id)
        .where(DeckAttempt.user_id == user_id)
        .group_by(DeckAttempt.deck_id)
        .having(func.max(case((DeckAttempt.is_archived == True, 1), else_=0)) == 1)
    )
    archived_deck_ids = {r[0] for r in archived_res.all()}

    all_user_deck_ids = (roadmap_active_deck_ids | interacted_deck_ids)
    active_deck_ids = (all_user_deck_ids - frozen_deck_ids) - archived_deck_ids

    if not active_deck_ids:
        return {
            "id": "global-focus",
            "title": "Global Daily Focus Queue ⚡",
            "deck_title": "Daily Focus (All Decks)",
            "is_global_focus": True,
            "total": 0,
            "questions": [],
            "effective_study_settings": {
                "learning_mode": "fsrs",
                "auto_play_audio": True,
                "sfx_enabled": True
            }
        }

    # Subquery: exclude cards learned today
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review", "speed_skim"])
     )\
     .group_by(UserAnswer.card_id).subquery()

    cards_query = (
        select(Flashcard, FlashcardDeck.title.label("deck_title"), UserCardMastery)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .outerjoin(min_answer_sub, UserCardMastery.card_id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id.in_(active_deck_ids),
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None)),
            UserCardMastery.due <= day_end,
            or_(
                min_answer_sub.c.min_created == None,
                min_answer_sub.c.min_created < day_start
            ),
            or_(
                UserCardMastery.last_review == None,
                UserCardMastery.last_review < day_start
            )
        )
    )

    # Priority: cards lowest in stability (highest forgetting danger), then earliest due
    cards_query = cards_query.order_by(
        func.coalesce(UserCardMastery.stability, 0.0).asc(),
        UserCardMastery.due.asc()
    ).limit(limit)

    res = await db.execute(cards_query)
    rows = res.all()

    questions = []
    for (card, deck_title, mastery) in rows:
        c_dict = {
            "id": card.id,
            "deck_id": card.deck_id,
            "deck_title": deck_title,
            "content": card.content,
            "explanation": card.explanation,
            "image": card.back_img,
            "audio": card.front_audio_url,
            "front_audio_url": card.front_audio_url,
            "back_audio_url": card.back_audio_url,
            "front_img": card.front_img,
            "back_img": card.back_img,
            "others": card.others,
            "state": mastery.state,
            "stability": mastery.stability,
            "difficulty": mastery.difficulty,
            "due": mastery.due.isoformat() if mastery.due else None,
            "step": mastery.step,
            "box_level": mastery.box_level,
            "is_starred": mastery.is_starred,
            "is_ignored": mastery.is_ignored
        }
        questions.append(c_dict)

    # Automatically shuffle cards across active decks so they are thoroughly blended
    random.shuffle(questions)
    for idx, q in enumerate(questions, start=1):
        q["orig_index"] = idx

    await resolve_play_cards(questions, db)

    return {
        "id": "global-focus",
        "title": "Global Daily Focus Queue ⚡",
        "deck_title": "Daily Focus (All Decks)",
        "is_global_focus": True,
        "total": len(questions),
        "questions": questions,
        "effective_study_settings": {
            "learning_mode": "fsrs",
            "auto_play_audio": True,
            "sfx_enabled": True
        }
    }







@router.get("/{deck_id}/leaderboard")
async def get_deck_leaderboard(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Get top users studying this deck with their learned cards count, deck streak, and rank."""
    from app.modules.auth.models import User
    from app.modules.gamification.models import UserGamification
    from app.modules.deck.models import Flashcard, UserCardMastery, UserDeckGoal
    from sqlalchemy import case
    
    current_user_id = AuthService.get_user_id(request)
    
    stmt = (
        select(
            User.id.label("user_id"),
            User.username,
            User.full_name,
            func.count(func.distinct(case((UserCardMastery.state > 0, UserCardMastery.card_id)))).label("learned_cards"),
            func.coalesce(UserGamification.xp, 0).label("xp")
        )
        .join(UserCardMastery, User.id == UserCardMastery.user_id)
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .outerjoin(UserGamification, UserGamification.user_id == User.id)
        .where(
            Flashcard.deck_id == deck_id
        )
        .group_by(User.id, User.username, User.full_name, UserGamification.xp)
        .order_by(
            func.count(func.distinct(case((UserCardMastery.state > 0, UserCardMastery.card_id)))).desc(),
            func.coalesce(UserGamification.xp, 0).desc()
        )
        .limit(20)
    )
    
    res = await db.execute(stmt)
    rows = res.all()
    
    # Batch query deck streak for all users on leaderboard (fixes N+1)
    user_ids = [r.user_id for r in rows]
    streak_map = {}
    if user_ids:
        goals_res = await db.execute(
            select(UserDeckGoal.user_id, UserDeckGoal.streak_count).where(
                UserDeckGoal.deck_id == deck_id,
                UserDeckGoal.user_id.in_(user_ids)
            )
        )
        streak_map = {row[0]: (row[1] or 0) for row in goals_res.all()}
    
    leaderboard = []
    for rank, r in enumerate(rows, start=1):
        deck_streak = streak_map.get(r.user_id, 0)
        leaderboard.append({
            "rank": rank,
            "user_id": r.user_id,
            "username": r.full_name or r.username or f"Người học #{r.user_id}",
            "avatar": None,
            "learned_cards": r.learned_cards or 0,
            "streak": deck_streak,
            "xp": r.xp or 0,
            "is_current_user": r.user_id == current_user_id
        })
        
    return {"leaderboard": leaderboard}


@router.get("/{deck_id}/roadmap-status")
async def get_deck_roadmap_status(request: Request, deck_id: int, target_date: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    deck_obj = await db.get(FlashcardDeck, deck_id)
    if not deck_obj:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})

    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_sett = user_sett_res.scalar_one_or_none()
    u_sett = user_sett.settings if (user_sett and user_sett.settings) else {}
    creator_sett = deck_obj.practice_settings if isinstance(deck_obj.practice_settings, dict) else {}

    is_frozen = bool(u_sett.get("is_frozen", False))
    disabled_modes = []
    if isinstance(creator_sett.get("disabled_modes"), list):
        disabled_modes.extend(creator_sett["disabled_modes"])
    if isinstance(u_sett.get("disabled_modes"), list):
        disabled_modes.extend(u_sett["disabled_modes"])
    disabled_modes = list(set(disabled_modes))

    now_utc = datetime.now(timezone.utc)
    day_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    day_end = day_start + timedelta(days=1) - timedelta(microseconds=1)

    total_cnt = await db.scalar(select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id)) or 0
    
    # 1. Thẻ đã review FSRS
    reviewed_card_sub = (
        select(UserCardMastery.card_id)
        .where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            UserCardMastery.last_review.isnot(None),
            UserCardMastery.card_id.isnot(None)
        )
    )
    reviewed_cnt = await db.scalar(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            UserCardMastery.last_review.isnot(None),
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
        )
    ) or 0

    # 2. Due Recall (đến hạn ôn hôm nay)
    due_recall_cnt = await db.scalar(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            UserCardMastery.last_review.isnot(None),
            UserCardMastery.due <= day_end,
            or_(UserCardMastery.last_review.is_(None), UserCardMastery.last_review < day_start),
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
        )
    ) or 0
    retained_cnt = max(0, reviewed_cnt - due_recall_cnt)

    # 3. Reinforced (chưa review, có hybrid_drill)
    hybrid_card_sub = (
        select(UserPracticeStats.card_id)
        .where(
            UserPracticeStats.user_id == user_id,
            UserPracticeStats.practice_mode == 'hybrid_drill',
            UserPracticeStats.card_id.isnot(None)
        )
    )
    reinforced_cnt = await db.scalar(
        select(func.count(func.distinct(Flashcard.id)))
        .join(UserPracticeStats, UserPracticeStats.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserPracticeStats.user_id == user_id,
            UserPracticeStats.practice_mode == 'hybrid_drill',
            Flashcard.id.not_in(reviewed_card_sub)
        )
    ) or 0

    # 4. Practiced (chưa review, chưa hybrid, có practice thường)
    practiced_cnt = await db.scalar(
        select(func.count(func.distinct(Flashcard.id)))
        .join(UserPracticeStats, UserPracticeStats.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserPracticeStats.user_id == user_id,
            UserPracticeStats.practice_mode != 'hybrid_drill',
            Flashcard.id.not_in(reviewed_card_sub),
            Flashcard.id.not_in(hybrid_card_sub)
        )
    ) or 0

    # 5. Previewed (chưa review, chưa hybrid, chưa practice, có skim)
    any_practice_sub = (
        select(UserPracticeStats.card_id)
        .where(
            UserPracticeStats.user_id == user_id,
            UserPracticeStats.card_id.isnot(None)
        )
    )
    skim_sub = (
        select(UserAnswer.card_id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(
            DeckAttempt.user_id == user_id,
            DeckAttempt.mode.in_(["speed_skim", "skim", "flip"]),
            UserAnswer.card_id.isnot(None)
        )
    )
    previewed_cnt = await db.scalar(
        select(func.count(func.distinct(Flashcard.id)))
        .outerjoin(UserCardMastery, and_(UserCardMastery.card_id == Flashcard.id, UserCardMastery.user_id == user_id))
        .where(
            Flashcard.deck_id == deck_id,
            or_(
                UserCardMastery.last_answered.isnot(None),
                Flashcard.id.in_(skim_sub)
            ),
            Flashcard.id.not_in(reviewed_card_sub),
            Flashcard.id.not_in(any_practice_sub)
        )
    ) or 0

    # 6. Fresh
    fresh_cnt = max(0, total_cnt - (reviewed_cnt + reinforced_cnt + practiced_cnt + previewed_cnt))

    streak = await db.scalar(
        select(UserDeckGoal.streak_count)
        .where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id)
    ) or 0

    return {
        "deck_title": deck_obj.title,
        "total_cards": total_cnt,
        # Option 2 (Action-Oriented) Unified Lifecycle:
        "fresh_count": fresh_cnt,
        "previewed_count": previewed_cnt,
        "practiced_count": practiced_cnt,
        "reinforced_count": reinforced_cnt,
        "retained_count": retained_cnt,
        "due_recall_count": due_recall_cnt,
        # Backwards compatible:
        "learned_cards": reviewed_cnt,
        "unlearned_cards": max(0, total_cnt - reviewed_cnt),
        "review_due_today": due_recall_cnt,
        "waiting_review_count": retained_cnt,
        "streak": streak,
        "is_frozen": is_frozen,
        "disabled_modes": disabled_modes,
        "is_practice_disabled": ("practice" in disabled_modes or "all_practice" in disabled_modes),
        "retention_rate": 90,
        "all_done": due_recall_cnt == 0,
        "stage_1_done": True,
        "stage_2_done": True,
    }


@router.get("/{deck_id}/roadmap-calendar")
async def get_deck_roadmap_calendar(request: Request, deck_id: int, month: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Get calendar heatmap data for a month. month format: YYYY-MM"""
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import Flashcard, DeckAttempt, UserAnswer, UserDeckGoal, UserDailyProgress
    import calendar as cal_mod
    
    try:
        year, month_num = int(month.split("-")[0]), int(month.split("-")[1])
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid month format. Use YYYY-MM."})
    
    _, days_in_month = cal_mod.monthrange(year, month_num)
    
    from app.modules.deck.models import UserDeckGoal
    goal_res = await db.execute(
        select(UserDeckGoal).where(
            UserDeckGoal.user_id == user_id,
            UserDeckGoal.deck_id == deck_id
        )
    )
    deck_goal = goal_res.scalar_one_or_none()
    daily_card_target = deck_goal.daily_card_target if (deck_goal and deck_goal.daily_card_target) else 20
    
    # Get user's roadmap pipeline settings for this deck
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    pipeline = settings.get("pipeline", [])
    # Get all active dates in this month for this deck
    month_start = datetime(year, month_num, 1)
    month_end = datetime(year, month_num, days_in_month, 23, 59, 59)

    month_start_str = month_start.strftime("%Y-%m-%d")
    month_end_str = month_end.strftime("%Y-%m-%d")
    progress_records_map = {}
    if deck_goal:
        progress_res = await db.execute(
            select(UserDailyProgress)
            .where(
                UserDailyProgress.goal_id == deck_goal.id,
                UserDailyProgress.date >= month_start_str,
                UserDailyProgress.date <= month_end_str
            )
        )
        progress_records_map = {p.date: p for p in progress_res.scalars().all()}
    
    # Get study minutes per day
    daily_study_res = await db.execute(
        select(
            func.date(UserAnswer.created_at).label("day"),
            func.sum(UserAnswer.active_time).label("total_time"),
            func.count(UserAnswer.id).label("answer_count")
        )
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(
            Flashcard.deck_id == deck_id,
            DeckAttempt.user_id == user_id,
            UserAnswer.created_at >= month_start,
            UserAnswer.created_at <= month_end
        )
        .group_by(func.date(UserAnswer.created_at))
    )
    daily_data = {}
    for row in daily_study_res.all():
        day_val = row[0]
        if isinstance(day_val, str):
            day_key = day_val
        elif isinstance(day_val, (datetime, date)):
            day_key = day_val.strftime("%Y-%m-%d") if isinstance(day_val, datetime) else day_val.isoformat()
        else:
            continue
        daily_data[day_key] = {
            "study_seconds": float(row[1] or 0),
            "answer_count": int(row[2] or 0)
        }
    
    # Build days array
    days = []
    for d in range(1, days_in_month + 1):
        day_date = date(year, month_num, d)
        day_str = day_date.isoformat()
        info = daily_data.get(day_str, {"study_seconds": 0, "answer_count": 0})
        is_active = info["answer_count"] > 0
        study_minutes = round(info["study_seconds"] / 60.0, 1)
        
        p_record = progress_records_map.get(day_str)
        is_rescued = getattr(p_record, "is_rescued", False) if p_record else False
        is_target_met = getattr(p_record, "is_target_met", False) if p_record else False
        
        completion_percent = 0
        if is_target_met or is_rescued:
            completion_percent = 100
        elif is_active:
            if settings.get("roadmap_active"):
                completion_percent = 50
            else:
                answer_count = info["answer_count"]
                if answer_count >= daily_card_target:
                    completion_percent = 100
                elif study_minutes >= 10:
                    completion_percent = 100
                elif study_minutes >= 5:
                    completion_percent = 75
                else:
                    completion_percent = 50
        
        days.append({
            "date": day_str,
            "day_of_week": day_date.weekday(),  # 0=Monday
            "active": is_active or is_target_met or is_rescued,
            "is_target_met": is_target_met,
            "rescued": is_rescued,
            "completion_percent": completion_percent,
            "study_minutes": study_minutes,
            "answer_count": info["answer_count"]
        })
    
    return {
        "month": month,
        "days": days,
        "total_active_days": sum(1 for d in days if d["active"]),
        "total_study_minutes": round(sum(d["study_minutes"] for d in days), 1)
    }


@router.post("/{deck_id}/roadmap-rescue")
async def rescue_deck_roadmap_day(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Manually use a Streak Freeze card to rescue an uncompleted day."""
    user_id = AuthService.get_user_id(request)
    body = await request.json()
    target_date_str = body.get("date")
    if not target_date_str:
        return JSONResponse(status_code=400, content={"error": "Thiếu ngày cần giải cứu"})
        
    from app.modules.gamification.models import UserGamification
    res_gamify = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = res_gamify.scalar_one_or_none()
    
    freeze_count = user_gamify.streak_freeze_count if (user_gamify and user_gamify.streak_freeze_count) else 0
    if freeze_count <= 0:
        return JSONResponse(status_code=400, content={"error": "Bạn không có đủ Thẻ Cứu Streak. Hãy tích điểm để đổi thẻ trong Cửa Hàng!"})
        
    from app.modules.deck.models import UserDeckGoal
    goal_res = await db.execute(select(UserDeckGoal).where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id))
    goal = goal_res.scalar_one_or_none()
    if not goal:
        goal = UserDeckGoal(user_id=user_id, deck_id=deck_id, streak_count=0)
        db.add(goal)
        await db.flush()
        
    prog_res = await db.execute(select(UserDailyProgress).where(UserDailyProgress.goal_id == goal.id, UserDailyProgress.date == target_date_str))
    prog = prog_res.scalar_one_or_none()
    
    if not prog:
        prog = UserDailyProgress(goal_id=goal.id, date=target_date_str, is_target_met=True, is_rescued=True)
        db.add(prog)
    else:
        prog.is_target_met = True
        prog.is_rescued = True
        
    user_gamify.streak_freeze_count = max(0, freeze_count - 1)
    user_gamify.last_freeze_used_at = datetime.utcnow()
    
    await db.commit()
    return {
        "success": True, 
        "message": f"🎉 Đã giải cứu thành công ngày {target_date_str}!", 
        "streak_freeze_count": user_gamify.streak_freeze_count
    }


@router.get("/{deck_id}/roadmap-pipeline-history")
async def get_pipeline_history(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Get pipeline change history for a deck."""
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import RoadmapPipelineHistory
    
    history_res = await db.execute(
        select(RoadmapPipelineHistory).where(
            RoadmapPipelineHistory.user_id == user_id,
            RoadmapPipelineHistory.deck_id == deck_id
        ).order_by(RoadmapPipelineHistory.changed_at.desc())
    )
    history_items = history_res.scalars().all()
    
    result = []
    for item in history_items:
        result.append({
            "id": item.id,
            "pipeline_json": item.pipeline_json,
            "changed_at": item.changed_at.isoformat() if item.changed_at else None,
            "change_type": item.change_type,
            "change_summary": item.change_summary,
            "effective_from": item.effective_from.isoformat() if item.effective_from else None,
            "effective_until": item.effective_until.isoformat() if item.effective_until else None
        })
    
    return {"history": result}


@router.post("/{deck_id}/reset-progress")
async def reset_deck_progress(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"error": "Please sign in to reset progress"})
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import (
        Flashcard, UserCardMastery, UserPracticeStats, DeckSession, 
        DeckAttempt, UserAnswer, UserDeckGoal, UserDailyProgress, RoadmapPipelineHistory
    )
    from sqlalchemy import delete
    
    try:
        # Use subqueries to avoid huge parameter lists and identity map overhead
        card_id_subq = select(Flashcard.id).where(Flashcard.deck_id == deck_id)
        attempt_id_subq = select(DeckAttempt.id).where(
            DeckAttempt.user_id == user_id,
            DeckAttempt.deck_id == deck_id
        )
        goal_id_subq = select(UserDeckGoal.id).where(
            UserDeckGoal.user_id == user_id,
            UserDeckGoal.deck_id == deck_id
        )
        
        # 1. Delete UserCardMastery for this user & cards in deck
        await db.execute(
            delete(UserCardMastery).where(
                UserCardMastery.user_id == user_id,
                UserCardMastery.card_id.in_(card_id_subq)
            ).execution_options(synchronize_session=False)
        )
        
        # 2. Delete UserPracticeStats for this user & cards in deck
        await db.execute(
            delete(UserPracticeStats).where(
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.card_id.in_(card_id_subq)
            ).execution_options(synchronize_session=False)
        )
        
        # 3. Delete UserAnswer and DeckAttempt for this user & deck
        await db.execute(
            delete(UserAnswer).where(
                UserAnswer.attempt_id.in_(attempt_id_subq)
            ).execution_options(synchronize_session=False)
        )
        await db.execute(
            delete(DeckAttempt).where(
                DeckAttempt.id.in_(attempt_id_subq)
            ).execution_options(synchronize_session=False)
        )
        
        # 4. Delete active deck sessions for this user & deck
        await db.execute(
            delete(DeckSession).where(
                DeckSession.user_id == user_id,
                DeckSession.deck_id == deck_id
            ).execution_options(synchronize_session=False)
        )
        
        # 5. Delete daily progress and deck goals
        await db.execute(
            delete(UserDailyProgress).where(
                UserDailyProgress.goal_id.in_(goal_id_subq)
            ).execution_options(synchronize_session=False)
        )
        await db.execute(
            delete(UserDeckGoal).where(
                UserDeckGoal.id.in_(goal_id_subq)
            ).execution_options(synchronize_session=False)
        )
        
        # 6. Delete RoadmapPipelineHistory for this user & deck
        await db.execute(
            delete(RoadmapPipelineHistory).where(
                RoadmapPipelineHistory.user_id == user_id,
                RoadmapPipelineHistory.deck_id == deck_id
            ).execution_options(synchronize_session=False)
        )
        
        await db.commit()
        return {"status": "ok", "message": "Deck progress reset successfully"}
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error resetting deck progress for deck {deck_id}: {e}")
        return JSONResponse(status_code=500, content={"error": f"Failed to reset deck progress: {str(e)}"})


@router.get("/{deck_id}/roadmap-test-questions")
async def get_roadmap_test_questions(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    from app.modules.deck.models import Flashcard, FlashcardDeck, UserDeckSettings, UserCardMastery, UserAnswer, DeckAttempt, DeckSession
    import random
    import json

    # Load deck
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})

    deck_title = deck.title
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Check for existing active Roadmap Test Session for today
    sess_res = await db.execute(
        select(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    existing_sess = sess_res.scalar_one_or_none()
    if existing_sess and existing_sess.state_json:
        try:
            state = json.loads(existing_sess.state_json)
            if state.get("created_date") == today_str and state.get("questions"):
                # Load settings for display
                user_sett_res = await db.execute(
                    select(UserDeckSettings).where(
                        UserDeckSettings.user_id == user_id,
                        UserDeckSettings.deck_id == deck_id
                    ).order_by(UserDeckSettings.id.desc()).limit(1)
                )
                user_sett = user_sett_res.scalar_one_or_none()
                settings = user_sett.settings if (user_sett and user_sett.settings) else {}
                migrated = migrate_practice_settings(settings)
                creator_migrated = {}
                if deck.practice_settings and isinstance(deck.practice_settings, dict):
                    creator_migrated = migrate_practice_settings(deck.practice_settings)

                return {
                    "title": deck_title,
                    "deck_title": deck_title,
                    "questions": state["questions"],
                    "total": len(state["questions"]),
                    "current_index": existing_sess.current_index,
                    "saved_answers": state.get("saved_answers", {}),
                    "practiceTotalAnswered": state.get("practiceTotalAnswered", 0),
                    "practiceCorrectCount": state.get("practiceCorrectCount", 0),
                    "sessionXP": state.get("sessionXP", 0),
                    "streak": state.get("streak", 0),
                    "practice_settings": migrated,
                    "creator_settings": creator_migrated
                }
        except Exception as e:
            logger.warning(f"Error loading existing test session state for deck {deck_id}: {e}")

    # Load all cards for deck cleanly via async query
    all_cards_res = await db.execute(
        select(Flashcard).where(Flashcard.deck_id == deck_id)
    )
    all_cards = list(all_cards_res.scalars().all())
    if not all_cards:
        return JSONResponse(status_code=404, content={"error": "No cards in deck"})

    # Detect whether current test step is MCQ or Typing
    pipeline_steps = status_info.get("pipeline", [])
    current_step_idx = status_info.get("current_step_index", 0)

    target_test_mode = "mcq"
    if pipeline_steps and current_step_idx < len(pipeline_steps):
        curr_step = pipeline_steps[current_step_idx]
        step_type = curr_step.get("type")
        if step_type in ("mcq", "typing"):
            target_test_mode = step_type
    else:
        test_step = next((st for st in pipeline_steps if st.get("type") in ("mcq", "typing")), None)
        if test_step:
            target_test_mode = test_step.get("type", "mcq")

    # Priority 1 for Roadmap Test: DECK CREATOR PRACTICE SETTINGS (cấu hình gốc của bộ thẻ)
    active_pairs = []
    creator_migrated = {}
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        creator_migrated = migrate_practice_settings(deck.practice_settings)
        active_pairs = creator_migrated.get(target_test_mode, {}).get("active_pairs", [])
        if not active_pairs and target_test_mode != "mcq":
            active_pairs = creator_migrated.get("mcq", {}).get("active_pairs", [])
        if not active_pairs:
            active_pairs = deck.practice_settings.get("active_pairs", [])

    # Priority 2: User custom settings if creator settings are empty
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        ).order_by(UserDeckSettings.id.desc()).limit(1)
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    migrated = migrate_practice_settings(settings)
    
    if not active_pairs:
        mode_setts = migrated.get(target_test_mode, {})
        active_pairs = mode_setts.get("active_pairs", [])
        if not active_pairs and target_test_mode != "mcq":
            active_pairs = migrated.get("mcq", {}).get("active_pairs", [])

    if not active_pairs:
        active_pairs = [{"q": "front", "a": "back"}]

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_utc = datetime.utcnow() - timedelta(days=1)
    
    # 1. Cards overdue by > 1 day (quá hạn 1 ngày chưa ôn)
    overdue_res = await db.execute(
        select(Flashcard)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.due <= yesterday_utc
        )
    )
    overdue_cards = list(overdue_res.scalars().all())

    # 2. Cards learned today
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
     )\
     .group_by(UserAnswer.card_id).subquery()

    today_cards_res = await db.execute(
        select(Flashcard)
        .join(min_answer_sub, Flashcard.id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created >= today_start
        )
    )
    today_cards = list(today_cards_res.scalars().all())
    
    # 3. Previously learned cards
    prev_cards_res = await db.execute(
        select(Flashcard)
        .join(min_answer_sub, Flashcard.id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created < today_start
        )
    )
    prev_cards = list(prev_cards_res.scalars().all())
    target_count_from_pipeline = 15
    
    if pipeline_steps and current_step_idx < len(pipeline_steps):
        curr_step = pipeline_steps[current_step_idx]
        if curr_step.get("question_count"):
            try:
                target_count_from_pipeline = int(curr_step["question_count"])
            except (ValueError, TypeError):
                pass
    elif settings.get("roadmap_test_question_count"):
        try:
            target_count_from_pipeline = int(settings["roadmap_test_question_count"])
        except (ValueError, TypeError):
            pass

    max_target_count = max(1, min(target_count_from_pipeline, len(all_cards)))
    selected_cards = []
    selected_ids = set()

    for c in overdue_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    for c in today_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    for c in prev_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    # Removed padding with unlearned cards. Only test on cards that the user has learned/seen.

    random.shuffle(selected_cards)

    formatted_questions = []
    for idx, card in enumerate(selected_cards, start=1):
        pair = random.choice(active_pairs)
        q_key = pair.get("q", "front")
        a_key = pair.get("a", "back")

        front_text = extract_card_val(card, q_key)
        acceptable_answers = extract_card_answers(card, a_key)
        primary_answer = acceptable_answers[0] if acceptable_answers else extract_card_val(card, "back")
        back_text = primary_answer

        # Build candidate distractor cards from all_cards
        other_cards = [c for c in all_cards if c.id != card.id]
        random.shuffle(other_cards)

        seen_a_vals = {back_text.lower()}
        selected_distractor_cards = []

        for oc in other_cards:
            a_val = extract_card_val(oc, a_key if isinstance(a_key, str) else (a_key[0] if a_key else "back"))
            if a_val and a_val.lower() not in seen_a_vals:
                seen_a_vals.add(a_val.lower())
                selected_distractor_cards.append(oc)
                if len(selected_distractor_cards) >= 3:
                    break

        # Assemble 4 choice option card objects (1 correct card + up to 3 distractor cards)
        choice_cards = [card] + selected_distractor_cards
        random.shuffle(choice_cards)

        options_list = []
        choice_item_ids = []
        choices_data = []

        for i, c_item in enumerate(choice_cards):
            q_val = extract_card_val(c_item, q_key)
            a_val = extract_card_val(c_item, a_key if isinstance(a_key, str) else (a_key[0] if a_key else "back"))
            c_front = (c_item.content or "").strip()
            c_back = (c_item.explanation or "").strip()
            is_correct = (c_item.id == card.id)

            options_list.append({
                "id": i + 1,
                "content": a_val,
                "is_correct": is_correct,
                "card_id": c_item.id
            })
            choice_item_ids.append(c_item.id)
            choices_data.append({
                "id": c_item.id,
                "text": a_val,
                "q_text": q_val,
                "front": c_front,
                "back": c_back,
                "card": {
                    "id": c_item.id,
                    "content": c_item.content,
                    "explanation": c_item.explanation,
                    "others": fix_static_urls(c_item.others),
                    "front_audio_url": fix_static_urls(c_item.front_audio_url),
                    "back_audio_url": fix_static_urls(c_item.back_audio_url),
                    "front_img": fix_static_urls(c_item.front_img),
                    "back_img": fix_static_urls(c_item.back_img)
                }
            })

        formatted_questions.append({
            "id": card.id,
            "orig_index": idx,
            "content": card.content,
            "explanation": card.explanation,
            "options": options_list,
            "front_audio_url": fix_static_urls(card.front_audio_url),
            "back_audio_url": fix_static_urls(card.back_audio_url),
            "others": fix_static_urls(card.others),
            "image": fix_static_urls(card.back_img),
            "audio": fix_static_urls(card.front_audio_url),
            "question_type": target_test_mode,
            "practice_submode": target_test_mode,
            "practice": {
                "question": front_text,
                "choices": [o["content"] for o in options_list],
                "choice_item_ids": choice_item_ids,
                "choices_data": choices_data,
                "correct_index": next((i for i, o in enumerate(options_list) if o["is_correct"]), 0),
                "correct_answer": primary_answer,
                "acceptable_answers": acceptable_answers,
                "question_key": q_key,
                "answer_key": a_key
            }
        })



    # Persist newly generated test session for today
    new_state = {
        "created_date": today_str,
        "questions": formatted_questions,
        "saved_answers": {},
        "practiceTotalAnswered": 0,
        "practiceCorrectCount": 0,
        "sessionXP": 0,
        "streak": 0
    }
    if existing_sess:
        existing_sess.current_index = 0
        existing_sess.state_json = json.dumps(new_state)
        existing_sess.updated_at = datetime.utcnow()
    else:
        new_sess = DeckSession(
            user_id=user_id,
            deck_id=deck_id,
            mode="roadmap_test",
            current_index=0,
            state_json=json.dumps(new_state)
        )
        db.add(new_sess)
    await db.commit()

    return {
        "title": deck_title,
        "deck_title": deck_title,
        "questions": formatted_questions,
        "total": len(formatted_questions),
        "current_index": 0,
        "saved_answers": {},
        "practiceTotalAnswered": 0,
        "practiceCorrectCount": 0,
        "sessionXP": 0,
        "streak": 0,
        "practice_settings": migrated,
        "creator_settings": creator_migrated
    }


@router.post("/{deck_id}/roadmap-test-submit")
async def submit_roadmap_test(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckAttempt, UserAnswer, DeckSession, UserDeckSettings
    from sqlalchemy import delete
    from datetime import datetime
    
    answers = data.get("answers", [])
    total_questions = len(answers)
    correct_count = sum(1 for a in answers if a.get("is_correct"))
    score_percentage = (correct_count / total_questions * 100.0) if total_questions > 0 else 0.0

    pass_threshold = 80
    try:
        user_sett_res = await db.execute(
            select(UserDeckSettings.settings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            ).order_by(UserDeckSettings.id.desc()).limit(1)
        )
        user_sett = user_sett_res.scalar_one_or_none() or {}
        raw_pipeline = user_sett.get("pipeline", [])
        if isinstance(raw_pipeline, list):
            for st in raw_pipeline:
                if isinstance(st, dict) and st.get("type") in ("mcq", "typing"):
                    pass_threshold = int(st.get("pass_threshold", 80))
                    break
        elif user_sett.get("roadmap_pass_threshold"):
            pass_threshold = int(user_sett.get("roadmap_pass_threshold", 80))
    except Exception:
        pass_threshold = 80

    passed = score_percentage >= float(pass_threshold)

    # Determine attempt mode: roadmap_typing or roadmap_mcq
    test_mode = data.get("mode") or data.get("test_mode")
    if not test_mode:
        if isinstance(raw_pipeline, list):
            for st in raw_pipeline:
                if isinstance(st, dict) and st.get("type") in ("mcq", "typing"):
                    test_mode = st.get("type")
                    break
    if test_mode in ("roadmap_typing", "typing"):
        attempt_mode = "roadmap_typing"
    else:
        attempt_mode = "roadmap_mcq"

    now_utc = datetime.utcnow()
    # 1. Record DeckAttempt
    attempt = DeckAttempt(
        user_id=user_id,
        deck_id=deck_id,
        mode=attempt_mode,
        total_cards=total_questions,
        score=int(round(score_percentage)),
        started_at=now_utc,
        completed_at=now_utc
    )
    db.add(attempt)
    await db.flush()

    # 2. Record UserAnswers
    for ans in answers:
        card_id = ans.get("card_id")
        if card_id:
            user_ans = UserAnswer(
                attempt_id=attempt.id,
                card_id=card_id,
                is_correct=ans.get("is_correct", False),
                active_time=ans.get("active_time", 2.0)
            )
            db.add(user_ans)

    # 3. Clean up the finished roadmap_test session
    await db.execute(
        delete(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )

    await db.commit()

    return {
        "status": "ok",
        "passed": passed,
        "pass_threshold": pass_threshold,
        "score": round(score_percentage, 1),
        "correct_count": correct_count,
        "total_questions": total_questions,
        "message": "Bài kiểm tra hoàn thành xuất sắc!" if passed else f"Bạn chưa đạt điểm đỗ ({pass_threshold}%), hãy luyện tập thêm nhé!"
    }


@router.post("/{deck_id}/roadmap-test-reset")
async def reset_roadmap_test(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckSession
    from sqlalchemy import delete
    
    await db.execute(
        delete(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    await db.commit()
    return {"status": "ok"}


@router.post("/{deck_id}/roadmap-test-save-progress")
async def save_roadmap_test_progress(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckSession
    import json
    
    sess_res = await db.execute(
        select(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    sess = sess_res.scalar_one_or_none()
    if sess and sess.state_json:
        try:
            state = json.loads(sess.state_json)
            if "practiceAnswers" in data:
                state["saved_answers"] = data.get("practiceAnswers")
            if "practiceTotalAnswered" in data:
                state["practiceTotalAnswered"] = data.get("practiceTotalAnswered")
            if "practiceCorrectCount" in data:
                state["practiceCorrectCount"] = data.get("practiceCorrectCount")
            if "sessionXP" in data:
                state["sessionXP"] = data.get("sessionXP")
            if "streak" in data:
                state["streak"] = data.get("streak")
            
            sess.current_index = data.get("current_index", sess.current_index)
            sess.state_json = json.dumps(state)
            sess.updated_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            logger.warning(f"Error saving roadmap test progress for user {user_id}, deck {deck_id}: {e}")
    return {"status": "ok"}
