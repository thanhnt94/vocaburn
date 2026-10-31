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

@router.post("/explain")
async def explain_card(payload: CardExplainRequest, request: Request):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    card_text = payload.card or payload.question
    options = payload.options or []
    correct_answer = payload.correct_answer
    
    explanation = await ai_service.explain_card(card_text, options, correct_answer)
    return {"explanation": explanation}


@router.post("/record_answer")
async def record_answer(request: Request, data: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserAnswer, Flashcard, DeckAttempt, UserCardMastery
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface
    from sqlalchemy import and_, case

    user_id = AuthService.get_user_id(request)
    is_correct = data.get("is_correct", False)
    time_spent = int(data.get("time_spent", 0))
    card_id = int(data.get("card_id", data.get("question_id", 0)))
    local_date = data.get("local_date")
    tz_offset = data.get("tz_offset")
    if tz_offset is not None:
        try:
            tz_offset = int(tz_offset)
        except (ValueError, TypeError):
            tz_offset = 0
    else:
        tz_offset = 0

    if local_date:
        today_str = str(local_date)[:10]
    else:
        now_local = datetime.utcnow() - timedelta(minutes=tz_offset)
        today_str = now_local.strftime("%Y-%m-%d")

    is_practice = data.get("is_practice", False)

    # Map incoming rating or fall back to is_correct early
    rating_val = data.get("rating")
    if rating_val is not None:
        rating_val = int(rating_val)
    else:
        rating_val = 3 if is_correct else 1

    c_res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    card = c_res.scalar_one_or_none()
    
    goal_update_info = None
    mastery_update_info = None
    unlocked_badge_info = None
    is_originally_new = False

    if card:
        mode_val = data.get("mode") or data.get("practice_mode") or data.get("attempt_mode")
        if mode_val in ("speed_skim", "skim"):
            is_practice_mode = False
            attempt_mode = "speed_skim"
        elif mode_val in ("hybrid_drill", "hybrid"):
            is_practice_mode = True
            attempt_mode = "hybrid_drill"
        else:
            is_practice_mode = is_practice or (mode_val in ["practice", "roadmap_mcq", "roadmap_typing", "roadmap_test", "mcq", "typing", "listening", "hybrid_drill", "hybrid"])
            if is_practice_mode:
                if mode_val in ["roadmap_mcq", "mcq"]:
                    attempt_mode = "roadmap_mcq"
                elif mode_val in ["roadmap_typing", "typing"]:
                    attempt_mode = "roadmap_typing"
                elif mode_val in ["hybrid_drill", "hybrid"]:
                    attempt_mode = "hybrid_drill"
                else:
                    attempt_mode = "practice"
            else:
                attempt_mode = mode_val if mode_val in ["roadmap", "sequential", "play", "fsrs", "new", "review", "flip", "speed_skim", "skim"] else "play"
        attempt_res = await db.execute(
            select(DeckAttempt)
            .filter(
                DeckAttempt.user_id == user_id,
                DeckAttempt.deck_id == card.deck_id,
                DeckAttempt.mode == attempt_mode
            )
            .order_by(DeckAttempt.id.desc())
        )
        attempt = attempt_res.scalar()
        now_dt = datetime.utcnow()
        is_fresh_session = True
        if attempt and attempt.started_at:
            time_since_last = (now_dt - (attempt.completed_at or attempt.started_at)).total_seconds()
            if time_since_last < 2700: # 45 minutes of activity window
                is_fresh_session = False

        if is_fresh_session or not attempt:
            attempt = DeckAttempt(
                user_id=user_id,
                deck_id=card.deck_id,
                mode=attempt_mode,
                score=1 if (is_correct or (rating_val and rating_val >= 3)) else 0,
                total_cards=1,
                started_at=now_dt,
                completed_at=now_dt
            )
            db.add(attempt)
            await db.flush()
        else:
            attempt.total_cards = (attempt.total_cards or 0) + 1
            if is_correct or (rating_val and rating_val >= 3):
                attempt.score = (attempt.score or 0) + 1
            attempt.completed_at = now_dt

        db_answer = UserAnswer(
            attempt_id=attempt.id,
            card_id=card_id,
            is_correct=is_correct,
            active_time=float(time_spent),
            rating=rating_val
        )
        db.add(db_answer)
        await db.flush()

        # --- FSRS v6 Spaced Repetition Mastery Levels ---
        practice_mode = data.get("practice_mode", "mcq")  # mcq, typing, listening
        is_speed_skim = (mode_val in ("speed_skim", "skim"))
        
        if not is_practice_mode and not is_speed_skim:
            from fsrs import Card, Scheduler, Rating, State
            
            mastery_res = await db.execute(
                select(UserCardMastery).where(
                    UserCardMastery.user_id == user_id,
                    UserCardMastery.card_id == card_id
                )
            )
            mastery = mastery_res.scalar_one_or_none()
            if not mastery:
                is_originally_new = True
                mastery = UserCardMastery(
                    user_id=user_id,
                    card_id=card_id,
                    box_level=1,
                    consecutive_correct=0,
                    state=0,
                    stability=None,
                    difficulty=None,
                    step=0,
                    due=datetime.utcnow()
                )
                db.add(mastery)
                await db.flush()
            else:
                is_originally_new = (mastery.last_review is None)
    
            old_box_level = mastery.box_level
                
            rating_map = {
                1: Rating.Again,
                2: Rating.Hard,
                3: Rating.Good,
                4: Rating.Easy
            }
            rating_enum = rating_map.get(rating_val, Rating.Good)
            
            # Build fsrs.Card
            now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
            fsrs_card = build_fsrs_card(mastery, now_utc)
            
            # Run FSRS v6 scheduler with enable_fuzzing=False
            scheduler = Scheduler(enable_fuzzing=False)
            updated_card, review_log = scheduler.review_card(fsrs_card, rating_enum, now_utc)
            
            # Apply stability boost if it is Review state
            if updated_card.state == State.Review:
                updated_card.stability = apply_stability_boost(updated_card, rating_val, scheduler)
            
            # Save back FSRS properties
            mastery.stability = updated_card.stability
            mastery.difficulty = updated_card.difficulty
            mastery.step = updated_card.step
            
            state_reverse_map = {
                State.Learning: 1,
                State.Review: 2,
                State.Relearning: 3
            }
            mastery.state = state_reverse_map.get(updated_card.state, 1)
            # Save prior due date to track Option B roadmap eligibility
            mastery.last_due = mastery.due

            # Calculate fractional due date for Review cards
            if updated_card.state == State.Review:
                float_interval_days = (updated_card.stability / scheduler._FACTOR) * (
                    (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
                )
                float_interval_days = min(float_interval_days, float(scheduler.maximum_interval))
                float_interval_days = max(float_interval_days, 0.0)
                due_datetime = now_utc + timedelta(days=float_interval_days)
                mastery.due = due_datetime.replace(tzinfo=None)
            else:
                mastery.due = updated_card.due.replace(tzinfo=None)
                
            if updated_card.last_review:
                mastery.last_review = updated_card.last_review.replace(tzinfo=None)
                
            # Map box_level for gamification metrics & badges compatibility
            if mastery.state == 2: # Review
                if mastery.stability and mastery.stability >= 10.0 and (mastery.consecutive_correct or 0) >= 3:
                    mastery.box_level = 5
                elif mastery.stability and mastery.stability >= 3.0:
                    mastery.box_level = 4
                else:
                    mastery.box_level = 3
            elif mastery.state in (1, 3): # Learning / Relearning
                mastery.box_level = 2
            else:
                mastery.box_level = 1
                
            new_box_level = mastery.box_level
                
            # Update consecutive correct for compatibility
            if rating_val > 1:
                mastery.consecutive_correct = (mastery.consecutive_correct or 0) + 1
            else:
                mastery.consecutive_correct = 0
                
            next_intervals = estimate_intervals(scheduler, updated_card, now_utc)

            due_iso = None
            if mastery.due:
                d_str = mastery.due.isoformat()
                due_iso = d_str if (d_str.endswith("Z") or "+" in d_str) else f"{d_str}Z"

            last_review_iso = None
            if mastery.last_review:
                lr_str = mastery.last_review.isoformat()
                last_review_iso = lr_str if (lr_str.endswith("Z") or "+" in lr_str) else f"{lr_str}Z"

            mastery_update_info = {
                "old_level": old_box_level,
                "new_level": new_box_level,
                "consecutive_correct": mastery.consecutive_correct,
                "level_up": new_box_level > old_box_level,
                "state": mastery.state,
                "stability": mastery.stability,
                "difficulty": mastery.difficulty,
                "due": due_iso,
                "first_learned": (first_learned.isoformat() + "Z") if first_learned else None,
                "last_review": last_review_iso,
                "last_reviewed": last_review_iso,
                "intervals": next_intervals
            }
        elif is_speed_skim:
            # Safe exposure tracking for Speed Skim mode:
            # Records that card has been seen/browsed, but strictly preserves FSRS state
            mastery_res = await db.execute(
                select(UserCardMastery).where(
                    UserCardMastery.user_id == user_id,
                    UserCardMastery.card_id == card_id
                )
            )
            mastery = mastery_res.scalar_one_or_none()
            if not mastery:
                mastery = UserCardMastery(
                    user_id=user_id,
                    card_id=card_id,
                    box_level=1,
                    consecutive_correct=0,
                    state=0,
                    stability=None,
                    difficulty=None,
                    step=0,
                    due=datetime.utcnow(),
                    last_answered=datetime.utcnow()
                )
                db.add(mastery)
            else:
                mastery.last_answered = datetime.utcnow()
            await db.flush()

            mastery_update_info = {
                "is_skimmed": True,
                "state": mastery.state,
                "box_level": mastery.box_level,
                "last_answered": mastery.last_answered.isoformat() if mastery.last_answered else None
            }
        else:
            from app.modules.deck.models import UserPracticeStats
            p_stats_res = await db.execute(
                select(UserPracticeStats).where(
                    UserPracticeStats.user_id == user_id,
                    UserPracticeStats.card_id == card_id,
                    UserPracticeStats.practice_mode == practice_mode
                )
            )
            p_stats = p_stats_res.scalar_one_or_none()
            if not p_stats:
                p_stats = UserPracticeStats(
                    user_id=user_id,
                    card_id=card_id,
                    practice_mode=practice_mode,
                    correct_count=0,
                    wrong_count=0,
                    total_time_spent=0.0
                )
                db.add(p_stats)
            
            if is_correct:
                p_stats.correct_count = (p_stats.correct_count or 0) + 1
            else:
                p_stats.wrong_count = (p_stats.wrong_count or 0) + 1
            p_stats.total_time_spent = (p_stats.total_time_spent or 0.0) + float(time_spent)
            await db.flush()
            mastery_update_info = None

        
        # --- Goal Progress Tracking Logic ---
        from app.modules.deck.models import UserDeckGoal, UserDailyProgress, Flashcard, UserAnswer, DeckAttempt
        goal_res = await db.execute(
            select(UserDeckGoal).filter(
                UserDeckGoal.user_id == user_id, 
                UserDeckGoal.deck_id == card.deck_id, 
                UserDeckGoal.status == "active"
            )
        )
        goal = goal_res.scalar_one_or_none()
        if goal:

            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == today_str
                )
            )
            progress = prog_res.scalar_one_or_none()
            if not progress:
                # Count other new cards studied today for this deck to avoid mismatch
                try:
                    today_local_dt = date.fromisoformat(today_str)
                except Exception:
                    today_local_dt = datetime.utcnow().date()
                today_start_local = datetime(today_local_dt.year, today_local_dt.month, today_local_dt.day)
                today_start_utc = today_start_local + timedelta(minutes=tz_offset)

                first_answers = select(
                    UserAnswer.card_id,
                    func.min(UserAnswer.created_at).label("first_answered_at")
                ).join(
                    DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
                ).where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review", "speed_skim", "skim"])
                ).group_by(
                    UserAnswer.card_id
                ).subquery()

                count_today_res = await db.execute(
                    select(func.count(first_answers.c.card_id))
                    .join(Flashcard, Flashcard.id == first_answers.c.card_id)
                    .where(
                        Flashcard.deck_id == goal.deck_id,
                        first_answers.c.first_answered_at >= today_start_utc,
                        first_answers.c.card_id != card_id
                    )
                )
                count_other_cards = count_today_res.scalar() or 0

                progress = UserDailyProgress(
                    goal_id=goal.id,
                    date=today_str,
                    count_done=count_other_cards + 1,
                    is_target_met=(count_other_cards + 1) >= goal.daily_target
                )
                db.add(progress)
            else:
                progress.count_done += 1
                progress.is_target_met = (progress.count_done >= goal.daily_target)
            
            # Recalculate streak and rewards
            just_completed = (progress.count_done == goal.daily_target)
            bonus_xp = 0
            if just_completed:
                today_date = datetime.strptime(today_str, "%Y-%m-%d")
                yesterday_str = (today_date - timedelta(days=1)).strftime("%Y-%m-%d")
                
                if goal.last_completed_date == yesterday_str:
                    goal.streak_count += 1
                elif goal.last_completed_date == today_str:
                    pass
                else:
                    goal.streak_count = 1
                
                goal.last_completed_date = today_str
                bonus_xp = 50

            remaining = max(0, goal.daily_target - progress.count_done)
            if just_completed:
                msg = f"DAILY GOAL REACHED! 🎉 You're on a {goal.streak_count}-day streak & earned +50 Discipline XP! 💪"
            elif progress.is_target_met:
                msg = f"Limitless Learning! You are pushing limits today with {progress.count_done} cards! 🔥"
            elif remaining == 1:
                msg = "Outstanding! Just 1 card left to complete your daily goal! 🚀"
            else:
                msg = f"Excellent! You've done {progress.count_done}/{goal.daily_target} new cards today. Just {remaining} more to hit your goal, keep going! ⚡"
            
            is_new_card = True
            # Only send goal toast update if this was a new card
            if is_new_card:
                goal_update_info = {
                    "goal_id": goal.id,
                    "daily_target": goal.daily_target,
                    "done_today": progress.count_done,
                    "is_target_met": progress.is_target_met,
                    "just_completed": just_completed,
                    "streak_count": goal.streak_count,
                    "remaining_today": remaining,
                    "bonus_xp": bonus_xp,
                    "motivational_message": msg,
                    "is_new_card": is_new_card,
                    "is_new_question": is_new_card
                }
        # Defer commit to the end of the function for a single transaction
        await db.flush()

    # --- Gamification Logic & Achievements Check ---
    session_streak = int(data.get("session_streak", 0))
    is_first_ever = data.get("is_first_ever", False)

    base_xp = 0
    bonus_xp_gained = 0
    if is_practice or mode_val in ("speed_skim", "skim"):
        practice_mode = data.get("practice_mode", "mcq")
        if mode_val in ("speed_skim", "skim"):
            base_xp = 3
            if is_first_ever:
                bonus_xp_gained += 2
        elif is_correct:
            if practice_mode == "typing":
                base_xp = 5
            else:  # mcq, listening
                base_xp = 3
        else:
            base_xp = 1
            bonus_xp_gained = 0
        if session_streak >= 5:
            bonus_xp_gained += 1
    else:
        if rating_val == 4:
            base_xp = 7
        elif rating_val == 3:
            base_xp = 6
        elif rating_val == 2:
            base_xp = 5
        else:
            base_xp = 1
            
        if is_first_ever:
            bonus_xp_gained += 10
        if session_streak >= 5:
            bonus_xp_gained += 1
            
    xp_gain = base_xp + bonus_xp_gained
    gamify_res = await GamificationInterface.add_xp(db, user_id, xp_gain, source="deck_answer", commit=False)
    has_leveled_up = gamify_res["level_up"]
    current_level = gamify_res["current_level"]

    # Process daily goal bonus XP
    if goal_update_info and goal_update_info["bonus_xp"] > 0:
        bonus_res = await GamificationInterface.add_xp(db, user_id, goal_update_info["bonus_xp"], source="daily_goal_bonus", commit=False)
        if bonus_res["level_up"]:
            has_leveled_up = True
        current_level = bonus_res["current_level"]

    if has_leveled_up:
        await NotificationInterface.send(
            db, user_id, 
            "LEVEL UP! 🚀", 
            f"Congratulations! You reached level {current_level}!",
            "level_up"
        )

    # --- Achievements Check (throttled to avoid SQLite lock contention) ---
    should_check_badges = (
        is_first_ever
        or (goal_update_info is not None and goal_update_info.get("just_completed"))
        or (mastery_update_info is not None and mastery_update_info.get("level_up"))
        or ((attempt.total_cards or 0) % 5 == 0)
    )
    if should_check_badges:
        from app.modules.deck.routes.background_tasks import check_badges_async
        goal_streak = goal_update_info["streak_count"] if goal_update_info else 0
        background_tasks.add_task(check_badges_async, user_id, time_spent, is_correct, goal_streak)
    
    unlocked_badge_info = None

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent, local_date_str=today_str, tz_offset=tz_offset, commit=False)
    
    # Check if deck is 100% mastered (Lazy check: only if card just reached level 5)
    deck_mastered = False
    if mastery_update_info and mastery_update_info.get("new_level") == 5 and mastery_update_info.get("old_level") != 5:
        card_res = await db.execute(
            select(Flashcard.deck_id).where(Flashcard.id == card_id)
        )
        deck_id_val = card_res.scalar()
        if deck_id_val:
            total_c_res = await db.execute(
                select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id_val)
            )
            total_c = total_c_res.scalar() or 0
            
            mastered_c_res = await db.execute(
                select(func.count(UserCardMastery.id)).join(Flashcard).where(
                    Flashcard.deck_id == deck_id_val,
                    UserCardMastery.user_id == user_id,
                    UserCardMastery.box_level == 5
                )
            )
            mastered_c = mastered_c_res.scalar() or 0
            if total_c > 0 and mastered_c == total_c:
                deck_mastered = True
            
    await db.commit()

    return {
        "status": "ok", 
        "xp_gained": xp_gain + (goal_update_info["bonus_xp"] if goal_update_info else 0) + (unlocked_badge_info["xp_reward"] if unlocked_badge_info else 0), 
        "level_up": has_leveled_up,
        "goal_update": goal_update_info,
        "mastery_update": mastery_update_info,
        "unlocked_badge": unlocked_badge_info,
        "deck_mastered": deck_mastered
    }


@router.post("/undo_answer")
async def undo_answer(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserAnswer, Flashcard, UserCardMastery, UserDeckGoal, UserDailyProgress, DeckAttempt
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.gamification.models import XPTransaction
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface

    user_id = AuthService.get_user_id(request)
    card_id = int(data.get("card_id", 0))
    if not card_id:
        return JSONResponse(status_code=400, content={"error": "card_id is required"})

    tz_offset = data.get("tz_offset")
    if tz_offset is not None:
        try:
            tz_offset = int(tz_offset)
        except (ValueError, TypeError):
            tz_offset = 0
    else:
        tz_offset = 0

    local_date = data.get("local_date")
    if local_date:
        today_str = str(local_date)[:10]
    else:
        now_local = datetime.utcnow() - timedelta(minutes=tz_offset)
        today_str = now_local.strftime("%Y-%m-%d")

    # Find the most recent UserAnswer for this user and card
    ans_stmt = (
        select(UserAnswer)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id, UserAnswer.card_id == card_id)
        .order_by(UserAnswer.id.desc())
    )
    ans_res = await db.execute(ans_stmt)
    last_answer = ans_res.scalars().first()

    if not last_answer:
        return JSONResponse(status_code=400, content={"error": "No answers found for this card to undo"})

    is_correct = last_answer.is_correct
    time_spent = int(last_answer.active_time or 0)
    rating_val = last_answer.rating or (3 if is_correct else 1)

    # 1. Delete the answer
    await db.delete(last_answer)
    await db.flush()

    # 2. Re-evaluate FSRS mastery for this card
    rem_stmt = (
        select(UserAnswer)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id, UserAnswer.card_id == card_id)
        .order_by(UserAnswer.id.asc())
    )
    rem_res = await db.execute(rem_stmt)
    remaining_answers = rem_res.scalars().all()

    mastery_res = await db.execute(
        select(UserCardMastery).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id == card_id
        )
    )
    mastery = mastery_res.scalar_one_or_none()

    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    from fsrs import Card, Scheduler, Rating, State
    scheduler = Scheduler(enable_fuzzing=False)

    was_originally_new = len(remaining_answers) == 0

    if was_originally_new:
        if mastery:
            mastery.stability = None
            mastery.difficulty = None
            mastery.state = 0
            mastery.step = 0
            mastery.due = datetime.utcnow()
            mastery.last_review = None
            mastery.box_level = 1
            mastery.consecutive_correct = 0
    else:
        temp_card = Card()
        for idx, ans in enumerate(remaining_answers):
            ans_rating_map = {
                1: Rating.Again,
                2: Rating.Hard,
                3: Rating.Good,
                4: Rating.Easy
            }
            ans_rating_enum = ans_rating_map.get(ans.rating, Rating.Good)
            ans_time = ans.created_at.replace(tzinfo=timezone.utc) if ans.created_at else now_utc
            temp_card, _ = scheduler.review_card(temp_card, ans_rating_enum, ans_time)
            
            # Apply stability boost at each step of simulation if in State.Review
            if temp_card.state == State.Review:
                temp_card.stability = apply_stability_boost(temp_card, ans.rating, scheduler)

        if mastery:
            mastery.stability = temp_card.stability
            mastery.difficulty = temp_card.difficulty
            mastery.step = temp_card.step
            
            state_reverse_map = {
                State.Learning: 1,
                State.Review: 2,
                State.Relearning: 3
            }
            mastery.state = state_reverse_map.get(temp_card.state, 1)
            
            if temp_card.state == State.Review:
                float_interval_days = (temp_card.stability / scheduler._FACTOR) * (
                    (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
                )
                float_interval_days = min(float_interval_days, float(scheduler.maximum_interval))
                float_interval_days = max(float_interval_days, 0.0)
                due_datetime = now_utc + timedelta(days=float_interval_days)
                mastery.due = due_datetime.replace(tzinfo=None)
            else:
                mastery.due = temp_card.due.replace(tzinfo=None)
                
            if temp_card.last_review:
                mastery.last_review = temp_card.last_review.replace(tzinfo=None)
            else:
                mastery.last_review = None
                
            if mastery.state == 2:
                if mastery.stability and mastery.stability >= 10.0:
                    mastery.box_level = 5
                elif mastery.stability and mastery.stability >= 3.0:
                    mastery.box_level = 4
                else:
                    mastery.box_level = 3
            elif mastery.state in (1, 3):
                mastery.box_level = 2
            else:
                mastery.box_level = 1
                
            consec = 0
            for ans in remaining_answers:
                if ans.is_correct:
                    consec += 1
                else:
                    consec = 0
            mastery.consecutive_correct = consec

    # 3. Deduct XP
    base_xp = 0
    if rating_val == 4:
        base_xp = 7
    elif rating_val == 3:
        base_xp = 6
    elif rating_val == 2:
        base_xp = 5
    else:
        base_xp = 1

    is_first_ever = len(remaining_answers) == 0
    bonus_xp_gained = 0
    if is_first_ever:
        bonus_xp_gained += 10
        
    tx_stmt = (
        select(XPTransaction)
        .where(XPTransaction.user_id == user_id, XPTransaction.source == "deck_answer")
        .order_by(XPTransaction.id.desc())
    )
    tx_res = await db.execute(tx_stmt)
    last_tx = tx_res.scalars().first()
    
    xp_to_deduct = base_xp + bonus_xp_gained
    if last_tx:
        xp_to_deduct = last_tx.amount
    
    await GamificationInterface.revert_xp(db, user_id, xp_to_deduct, source="deck_answer")

    # 4. Revert Daily Goal progress
    card_res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    card = card_res.scalar_one_or_none()
    
    goal_update_info = None
    if card:
        goal_res = await db.execute(
            select(UserDeckGoal).filter(
                UserDeckGoal.user_id == user_id,
                UserDeckGoal.deck_id == card.deck_id,
                UserDeckGoal.status == "active"
            )
        )
        goal = goal_res.scalar_one_or_none()
        if goal:
            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == today_str
                )
            )
            progress = prog_res.scalar_one_or_none()
            if progress:
                if is_first_ever:
                    progress.count_done = max(0, progress.count_done - 1)
                    
                    if progress.is_target_met and progress.count_done < goal.daily_target:
                        progress.is_target_met = False
                        await GamificationInterface.revert_xp(db, user_id, 50, source="daily_goal_bonus")
                        
                        if goal.last_completed_date == today_str:
                            try:
                                today_date = date.fromisoformat(today_str)
                            except Exception:
                                today_date = datetime.utcnow().date()
                            yesterday_str = (today_date - timedelta(days=1)).strftime("%Y-%m-%d")
                            
                            yesterday_prog_res = await db.execute(
                                select(UserDailyProgress).filter(
                                    UserDailyProgress.goal_id == goal.id,
                                    UserDailyProgress.date == yesterday_str
                                )
                            )
                            yesterday_prog = yesterday_prog_res.scalar_one_or_none()
                            if yesterday_prog and yesterday_prog.is_target_met:
                                goal.last_completed_date = yesterday_str
                                goal.streak_count = max(0, goal.streak_count - 1)
                            else:
                                goal.last_completed_date = None
                                goal.streak_count = 0
                                
                    remaining = max(0, goal.daily_target - progress.count_done)
                    goal_update_info = {
                        "goal_id": goal.id,
                        "daily_target": goal.daily_target,
                        "done_today": progress.count_done,
                        "is_target_met": progress.is_target_met,
                        "just_completed": False,
                        "streak_count": goal.streak_count,
                        "remaining_today": remaining,
                        "is_new_card": is_first_ever
                    }

    # 5. Revert Stats
    await StatsInterface.revert_activity(
        db, user_id, is_correct, time_spent, local_date_str=today_str, tz_offset=tz_offset, commit=False
    )

    await db.commit()

    next_intervals = {}
    if not was_originally_new:
        next_intervals = estimate_intervals(scheduler, temp_card, now_utc)
    else:
        new_c = Card()
        next_intervals = estimate_intervals(scheduler, new_c, now_utc)

    # Query first and last review timestamps after deleting this answer
    r_times_stmt = select(
        func.min(UserAnswer.created_at),
        func.max(UserAnswer.created_at)
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         UserAnswer.card_id == card_id
     )
    r_times_res = await db.execute(r_times_stmt)
    r_times = r_times_res.first()
    first_learned = r_times[0] if r_times else None
    last_reviewed = r_times[1] if r_times else None

    reverted_fsrs = {
        "state": mastery.state if mastery else 0,
        "stability": mastery.stability if mastery else None,
        "difficulty": mastery.difficulty if mastery else None,
        "due": mastery.due.isoformat() if (mastery and mastery.due) else None,
        "last_review": mastery.last_review.isoformat() if (mastery and mastery.last_review) else None,
        "first_learned": first_learned.isoformat() if first_learned else None,
        "last_reviewed": last_reviewed.isoformat() if last_reviewed else None,
        "intervals": next_intervals
    }

    return {
        "status": "ok",
        "xp_deducted": xp_to_deduct,
        "box_level": mastery.box_level if mastery else 1,
        "fsrs": reverted_fsrs,
        "goal_update": goal_update_info
    }



@router.post("/{deck_id}/ask-ai")
async def ask_ai(deck_id: int, payload: dict, background_tasks: BackgroundTasks, request: Request, db: AsyncSession = Depends(get_db)):
    card_id = payload.get("card_id", payload.get("question_id"))
    field = payload.get("field", "explanation") # explanation, hint, mnemonic, or custom ID
    force = payload.get("force", False)
    sync = payload.get("sync", False)
    
    from app.modules.deck.models import Flashcard, FlashcardDeck
    from app.modules.admin.interface import AdminInterface
    from sqlalchemy.orm.attributes import flag_modified
    
    # Check if AI is enabled
    ai_config = await AdminInterface.get_ai_config(db)
    if not ai_config.get("enabled"):
        return {"error": "AI Services are disabled."}

    result = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = result.scalar_one_or_none()
    if not c: return {"error": "Not found"}
    
    physical_map = {
        "front": "content",
        "back": "explanation",
        "front_audio_content": "front_audio_content",
        "back_audio_content": "back_audio_content",
        "front_audio_url": "front_audio_url",
        "back_audio_url": "back_audio_url",
        "front_img": "front_img",
        "back_img": "back_img"
    }

    # Manual Save Override
    if payload:
        val = payload.get(field) or payload.get("content") or payload.get("ai_explanation")
        if val is not None:
            content_str = val.strip() if isinstance(val, str) else val
            if field in physical_map:
                setattr(c, physical_map[field], content_str)
            else:
                if not c.others:
                    c.others = {}
                c.others[field] = content_str
                flag_modified(c, "others")
            await db.commit()
            return {"content": content_str, "ai_explanation": content_str}
            
    # Return Cached values
    if not force:
        val = None
        if field in physical_map:
            val = getattr(c, physical_map[field])
        elif c.others and isinstance(c.others, dict) and field in c.others:
            val = c.others[field]
            
        if val and val.strip():
            return {"ai_explanation": val, "content": val}
            
    # Check template availability
    deck_res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    template = None
    if deck:
        if deck.practice_settings and isinstance(deck.practice_settings, dict):
            prompts = deck.practice_settings.get("ai_prompts", [])
            for p in prompts:
                if p.get("column") == field or p.get("id") == field:
                    template = p.get("prompt")
                    break
                    
    if not template or not template.strip():
        return {"error": "Không có prompt cấu hình cho tab AI này. Vui lòng thiết lập trong phần chỉnh sửa bộ thẻ."}

    # Sync Generation
    if sync:
        content = await _generate_ai_content_sync(db, deck_id, card_id, field)
        if field in physical_map:
            setattr(c, physical_map[field], content)
        else:
            if not c.others:
                c.others = {}
            c.others[field] = content
            flag_modified(c, "others")
        await db.commit()
        return {"ai_explanation": content, "content": content}
            
    # Background Generation
    # Check if Central SSO is enabled and active
    from app.modules.sso_module.service import SSOService
    from app.core.config import settings
    use_sso = False
    sso_server_url = None
    try:
        sso_config = await SSOService.get_config(db)
        if sso_config.is_enabled and sso_config.server_url:
            use_sso = True
            sso_server_url = sso_config.server_url.rstrip('/')
    except Exception as sso_err:
        logger.warning(f"[SSO CONFIG CHECK WARNING] failed to check SSO status: {sso_err}")

    if use_sso and sso_server_url:
        # Build prompt exactly like _generate_ai_content_sync
        options_text = ""
        card_options = getattr(c, "options", None)
        if card_options:
            options_text = ", ".join([o.content for o in card_options])
            
        correct_answer_text = c.explanation or ""
        if card_options:
            correct_opt = next((o for o in card_options if o.is_correct), None)
            if correct_opt:
                correct_answer_text = correct_opt.content
                
        prompt = _resolve_prompt_placeholders(template, c, deck, options_text, correct_answer_text)

        # Detect scheme dynamically (e.g. support HTTPS behind Nginx reverse proxy)
        scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
        netloc = request.url.netloc
        if "localhost" not in netloc and "127.0.0.1" not in netloc:
            scheme = "https"
        base_url = f"{scheme}://{netloc}"
        
        callback_url = f"{base_url}/api/v1/deck/ai-callback"
        queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
        
        # Submit to CentralAuth Queue
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{sso_server_url}/api/queue/submit",
                    json={
                        "satellite_source": "vocaburn",
                        "prompt": prompt,
                        "callback_url": callback_url,
                        "extra_data": json.dumps({
                            "task_type": "ai-explain",
                            "card_id": card_id,
                            "field": field,
                            "deck_id": deck_id
                        }),
                        "max_retries": 3
                    },
                    headers={"X-Queue-Token": queue_token},
                    timeout=30.0
                )
                if response.status_code == 200:
                    logger.info(f"[AI QUEUE] Task submitted to CentralAuth for card {card_id} field '{field}'")
                    return {"status": "processing", "message": f"AI {field} generation queued on CentralAuth."}
                else:
                    logger.error(f"[AI QUEUE ERROR] CentralAuth submit failed ({response.status_code}): {response.text}")
        except Exception as queue_err:
            logger.error(f"[AI QUEUE EXCEPTION] Failed to submit task: {queue_err}")
            
    # Fallback to local background task if SSO submission fails or is disabled
    background_tasks.add_task(_generate_ai_task, deck_id, card_id, field)
    return {"status": "processing", "message": f"AI {field} generation started in background."}


# ── Card Contributions migrated to community.py ──


# -- Roadmap and Test routes migrated to roadmap.py --

