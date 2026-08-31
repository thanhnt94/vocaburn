from app.modules.deck.services.fsrs_service import build_fsrs_card, estimate_intervals, apply_stability_boost
from app.modules.deck.services.roadmap_service import RoadmapService
from app.modules.deck.utils import (
    fix_static_urls, migrate_practice_settings,
    get_enabled_practice_modes, check_has_practice_setup, check_has_mcq_setup
)

get_deck_roadmap_status_helper = RoadmapService.get_deck_roadmap_status
get_deck_streak_for_user = RoadmapService.get_deck_streak_for_user

from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks, Query
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from app.modules.auth.services.auth_service import AuthService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.deck.services.excel_service import ExcelDeckService
from app.modules.deck.services.deck_service import DeckService
from app.modules.deck.services.ai_service import ai_service
from app.modules.deck.schemas import DeckSchema, CardSchema
from app.modules.deck.models import UserDeckSettings
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Deck"])

async def resolve_play_cards(cards_list, db):
    from .media_resolver import get_sso_server_url, resolve_card_dict, resolve_central_url
    sso_url = await get_sso_server_url(db)
    for c in cards_list:
        resolve_card_dict(c, sso_url)
        # Also resolve duplicate image, audio, or others keys
        for key in ["image", "audio"]:
            if key in c and c[key]:
                c[key] = resolve_central_url(c[key], sso_url)
        if "others" in c and isinstance(c["others"], dict):
            for key in ["front_audio_url", "back_audio_url", "front_img", "back_img"]:
                if key in c["others"] and c["others"][key]:
                    c["others"][key] = resolve_central_url(c["others"][key], sso_url)
    return cards_list


from app.modules.deck.schemas import CardExplainRequest

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
        mode_val = data.get("mode") or data.get("practice_mode")
        is_practice_mode = is_practice or (mode_val in ["practice", "roadmap_mcq", "roadmap_typing", "roadmap_test", "mcq", "typing", "listening"])
        if is_practice_mode:
            if mode_val in ["roadmap_mcq", "mcq"]:
                attempt_mode = "roadmap_mcq"
            elif mode_val in ["roadmap_typing", "typing"]:
                attempt_mode = "roadmap_typing"
            else:
                attempt_mode = "practice"
        else:
            attempt_mode = mode_val if mode_val in ["roadmap", "sequential", "play", "fsrs", "new", "review", "flip"] else "play"
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
        if not attempt:
            attempt = DeckAttempt(user_id=user_id, deck_id=card.deck_id, mode=attempt_mode)
            db.add(attempt)
            await db.flush()

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
        
        if not is_practice_mode:
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
                mastery.consecutive_correct += 1
            else:
                mastery.consecutive_correct = 0
                
            next_intervals = estimate_intervals(scheduler, updated_card, now_utc)

            # Skip first and last review timestamps query to save DB IO (not needed in record_answer real-time)
            first_learned = None
            last_reviewed = None

            mastery_update_info = {
                "old_level": old_box_level,
                "new_level": new_box_level,
                "consecutive_correct": mastery.consecutive_correct,
                "level_up": new_box_level > old_box_level,
                "state": mastery.state,
                "stability": mastery.stability,
                "difficulty": mastery.difficulty,
                "due": mastery.due.isoformat() if mastery.due else None,
                "first_learned": first_learned.isoformat() if first_learned else None,
                "last_reviewed": last_reviewed.isoformat() if last_reviewed else None,
                "intervals": next_intervals
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
                p_stats.correct_count += 1
            else:
                p_stats.wrong_count += 1
            p_stats.total_time_spent += float(time_spent)
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

            # Always synchronize to UTC date
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            
            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == today_str
                )
            )
            progress = prog_res.scalar_one_or_none()
            if not progress:
                # Count other new cards studied today for this deck to avoid mismatch
                today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                first_answers = select(
                    UserAnswer.card_id,
                    func.min(UserAnswer.created_at).label("first_answered_at")
                ).join(
                    DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
                ).where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
                ).group_by(
                    UserAnswer.card_id
                ).subquery()

                count_today_res = await db.execute(
                    select(func.count(first_answers.c.card_id))
                    .join(Flashcard, Flashcard.id == first_answers.c.card_id)
                    .where(
                        Flashcard.deck_id == goal.deck_id,
                        first_answers.c.first_answered_at >= today,
                        first_answers.c.card_id != card_id
                    )
                )
                actual_done_today = count_today_res.scalar() or 0

                progress = UserDailyProgress(
                    goal_id=goal.id,
                    date=today_str,
                    count_done=actual_done_today,
                    is_target_met=(actual_done_today >= goal.daily_target)
                )
                db.add(progress)
                await db.flush()
            # Only count toward goal if this is a BRAND NEW card in FSRS
            is_new_card = is_originally_new
            
            if is_new_card:
                progress.count_done += 1
            just_completed = False
            bonus_xp = 0
            
            if progress.count_done >= goal.daily_target and not progress.is_target_met:
                progress.is_target_met = True
                just_completed = True
                
                try:
                    today_date = date.fromisoformat(today_str)
                except Exception:
                    today_date = datetime.utcnow().date()
                
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
    if is_practice:
        practice_mode = data.get("practice_mode", "mcq")
        if is_correct:
            if practice_mode == "typing":
                base_xp = 5
            else:  # mcq, listening
                base_xp = 3
            if session_streak >= 5:
                bonus_xp_gained = 1
        else:
            base_xp = 1
            bonus_xp_gained = 0
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

    # --- Achievements Check ---
    from app.modules.deck.routes.background_tasks import check_badges_async
    goal_streak = goal_update_info["streak_count"] if goal_update_info else 0
    background_tasks.add_task(check_badges_async, user_id, time_spent, is_correct, goal_streak)
    
    unlocked_badge_info = None

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent)
    
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
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
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
    await StatsInterface.revert_activity(db, user_id, is_correct, time_spent)

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
        )
    )
    user_custom_settings = user_settings_res.scalar_one_or_none()
    settings_data = user_custom_settings if (user_custom_settings and isinstance(user_custom_settings, dict)) else (deck.practice_settings or {})
    pipeline = settings_data.get("pipeline", [])
    has_roadmap = bool(settings_data.get("roadmap_active", False) and isinstance(pipeline, list) and len(pipeline) > 0)
    
    return {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "instruction": deck.instruction,
        "creator_id": deck.creator_id,
        "is_collaborator": is_collaborator,
        "is_public": deck.is_public,
        "cards_count": c_count,
        "questions_count": c_count, # compatibility
        "tags": [t.name for t in deck.tags],
        "cover_image": deck.cover_image,
        "has_roadmap": has_roadmap,
        "category_name": deck.category.name if deck.category else "General"
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
    
    # 6. Fetch gamification stats
    from app.modules.gamification.interface import GamificationInterface
    user_stats = await GamificationInterface.get_user_stats(db, user_id)
    user_total_xp = user_stats.get("xp", 0)
    
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
    all_time_time_stmt = select(func.sum(UserAnswer.active_time)).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id
    )
    
    today_xp_res, today_time_res, all_time_time_res = await asyncio.gather(
        db.execute(today_xp_stmt),
        db.execute(today_time_stmt),
        db.execute(all_time_time_stmt)
    )
    
    user_today_xp = today_xp_res.scalar() or 0
    user_today_time = today_time_res.scalar() or 0
    user_all_time_time = all_time_time_res.scalar() or 0
    
    from fsrs import Scheduler
    scheduler = Scheduler(enable_fuzzing=False)
    new_card_template = build_fsrs_card(None, now_utc)
    default_new_intervals = estimate_intervals(scheduler, new_card_template, now_utc)
    
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
        else:
            fsrs_card = build_fsrs_card(m, now_utc)
            intervals = estimate_intervals(scheduler, fsrs_card, now_utc)
            
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
        "cards": cards_list,
        "questions": cards_list
    }

@router.get("/{deck_id}/play-data")
async def get_deck_play_data(request: Request, deck_id: int, mode: Optional[str] = None, lightweight: Optional[bool] = None, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    # Check if deck exists and enforce privacy
    deck_check = await DeckService.get_deck_by_id(db, deck_id)
    if not deck_check: return JSONResponse(status_code=404, content={"error": "Deck not found"})
    
    from app.modules.deck.models import DeckCollaborator
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None

    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"

    if not deck_check.is_public and deck_check.creator_id != user_id and user_id != 1 and not is_collaborator and not is_admin:
        return JSONResponse(status_code=403, content={"error": "This is a private deck"})

    if lightweight:
        from app.modules.deck.models import FlashcardDeck
        result = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(
                selectinload(FlashcardDeck.cards),
                selectinload(FlashcardDeck.tags)
            )
        )
        deck = result.scalar_one_or_none()
        if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
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
        } for i, c in enumerate(deck.cards)]
        
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
            "cards": cards_list,
            "questions": cards_list
        }

    is_practice = mode in ("mcq", "typing", "listening")
    
    from app.modules.deck.models import FlashcardDeck, Flashcard, Tag, DeckCollaborator, UserCardMastery, UserDeckSettings
    from app.modules.gamification.models import XPTransaction
    from app.modules.deck.models import UserAnswer, DeckAttempt
    from app.modules.gamification.interface import GamificationInterface

    # 1. Fetch deck with cards and tags in 1 optimized query
    deck_query = select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(
        selectinload(FlashcardDeck.cards),
        selectinload(FlashcardDeck.tags)
    )
    
    # 2. Prepare parallel tasks for user stats, mastery, and settings
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    user_sett_stmt = select(UserDeckSettings).where(
        UserDeckSettings.user_id == user_id,
        UserDeckSettings.deck_id == deck_id
    )
    collab_stmt = select(DeckCollaborator).where(
        DeckCollaborator.deck_id == deck_id, 
        DeckCollaborator.user_id == user_id
    )
    today_xp_stmt = select(func.sum(XPTransaction.amount)).where(
        XPTransaction.user_id == user_id,
        XPTransaction.created_at >= today_start
    )
    today_time_stmt = select(func.sum(UserAnswer.active_time)).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id,
        UserAnswer.created_at >= today_start
    )
    all_time_time_stmt = select(func.sum(UserAnswer.active_time)).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id
    )

    deck_res, user_sett_res, collab_res, user_stats, today_xp_res, today_time_res, all_time_time_res = await asyncio.gather(
        db.execute(deck_query),
        db.execute(user_sett_stmt),
        db.execute(collab_stmt),
        GamificationInterface.get_user_stats(db, user_id),
        db.execute(today_xp_stmt),
        db.execute(today_time_stmt),
        db.execute(all_time_time_stmt)
    )

    deck = deck_res.scalar_one_or_none()
    if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})

    user_sett = user_sett_res.scalar_one_or_none()
    is_collaborator = collab_res.scalar() is not None
    user_total_xp = user_stats.get("xp", 0)
    user_today_xp = today_xp_res.scalar() or 0
    user_today_time = today_time_res.scalar() or 0
    user_all_time_time = all_time_time_res.scalar() or 0

    # 3. Fetch Mastery records in 1 indexed query (Skip for practice mode)
    mastery_records = {}
    if not is_practice and user_id and deck.cards:
        card_ids = [c.id for c in deck.cards]
        mastery_stmt = select(UserCardMastery).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id.in_(card_ids)
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_records = {m.card_id: m for m in mastery_res.scalars().all()}

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
        for i, c in enumerate(deck.cards):
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
        from fsrs import Card, Scheduler, Rating, State
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        
        # Predefined static default intervals for new cards (Zero CPU cost)
        default_new_intervals = {1: "<1m", 2: "5m", 3: "10m", 4: "4d"}
        
        # Instantiate scheduler once only if needed for review cards
        scheduler = None
        
        for idx, c in enumerate(deck.cards):
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
            else:
                if scheduler is None:
                    scheduler = Scheduler(enable_fuzzing=False)
                fsrs_card = build_fsrs_card(m, now_utc)
                intervals = estimate_intervals(scheduler, fsrs_card, now_utc)
                        
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
                "stats": {
                    "total": m.consecutive_correct if m else 0,
                    "correct": m.consecutive_correct if m else 0
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
                    "first_learned": m.last_answered.isoformat() if (m and m.last_answered) else None,
                    "last_reviewed": m_last_review.isoformat() if m_last_review else None,
                    "intervals": intervals
                },
                "options": [],
                "image": fix_static_urls(c.back_img),
                "audio": fix_static_urls(c.front_audio_url),
                "others": fix_static_urls(c.others)
            })
        
    await resolve_play_cards(cards_list, db)
    return {
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
        "cards": cards_list,
        "questions": cards_list, # compatibility
        "practice_settings": deck.practice_settings,
        "user_settings": user_sett.settings if user_sett else None
    }


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
    current_index = data.get("current_index", 0)
    random_enabled = data.get("random_enabled", False)

    from app.modules.deck.models import Flashcard
    cards_res = await db.execute(
        select(Flashcard.id).where(Flashcard.deck_id == deck_id).order_by(Flashcard.id.asc())
    )
    card_ids = cards_res.scalars().all()
    total = len(card_ids)
    if total == 0:
        return {"next_index": 0}

    from app.modules.deck.models import UserCardMastery
    mastery_res = await db.execute(
        select(
            UserCardMastery.card_id,
            UserCardMastery.state,
            UserCardMastery.stability,
            UserCardMastery.due,
            UserCardMastery.last_review,
            UserCardMastery.is_ignored
        ).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id.in_(card_ids)
        )
    )
    mastery_map = {
        r.card_id: {
            "state": r.state or 0,
            "stability": r.stability,
            "due": r.due,
            "last_review": r.last_review,
            "is_ignored": bool(r.is_ignored)
        }
        for r in mastery_res.all()
    }

    ignored_indexes = set()
    for idx, c_id in enumerate(card_ids):
        m = mastery_map.get(c_id)
        if m and m["is_ignored"]:
            ignored_indexes.add(idx)

    effective_answered = set(answered_indexes) | ignored_indexes

    original_mode = mode
    target_mode = mode
    if mode == "roadmap":
        from app.modules.deck.models import UserDeckSettings
        user_sett_res = await db.execute(
            select(UserDeckSettings.settings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        settings = user_sett_res.scalar_one_or_none() or {}
        st_helper = await get_deck_roadmap_status_helper(db, user_id, deck_id, settings)
        current_step_idx = st_helper.get("current_step_index", 0)
        pipeline = st_helper.get("pipeline", [])
        if pipeline and current_step_idx < len(pipeline):
            current_step_type = pipeline[current_step_idx].get("type")
            target_mode = "fsrs" if current_step_type == "fsrs_review" else "new"
        else:
            target_mode = "fsrs" if st_helper.get("stage_1_done") else "new"

    if target_mode == "new":
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
                return {"next_index": random.choice(unanswered_new), "phase": "new"}
            else:
                return {"next_index": unanswered_new[0], "phase": "new"}
        elif all_new:
            if random_enabled:
                import random
                return {"next_index": random.choice(all_new), "phase": "new"}
            else:
                return {"next_index": all_new[0], "phase": "new"}
        else:
            return {"next_index": min(current_index + 1, total - 1), "phase": "free"}

    elif target_mode in ("fsrs", "fsrs_review"):
        now_utc = datetime.utcnow()
        
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
            
            if m["due"]:
                if m["due"] <= now_utc:
                    due_cards.append(card_info)
                else:
                    future_due_dates.append(m["due"])

        # 1. PRIORITY 1: Due Review Cards (Thẻ đã đến hạn ôn tập)
        if due_cards:
            candidates = [c for c in due_cards if c["idx"] != current_index]
            if not candidates:
                candidates = due_cards

            if random_enabled:
                import random
                selected = random.choice(candidates)
            else:
                # Lowest stability first
                candidates.sort(key=lambda x: (x["stability"], x["due"] or now_utc))
                selected = candidates[0]
                
            return {
                "next_index": selected["idx"],
                "phase": "review",
                "due_count": len(due_cards),
                "unlearned_count": len(all_new_cards),
                "total_cards": total,
                "learned_cards": len(all_learned_cards)
            }
            
        # 2. PRIORITY 2: New Cards (Học từ mới nếu không có từ nào đến hạn ôn)
        elif all_new_cards:
            if random_enabled:
                import random
                next_idx = random.choice(all_new_cards)
            else:
                forward_new = [i for i in all_new_cards if i > current_index]
                next_idx = forward_new[0] if forward_new else all_new_cards[0]
            return {
                "next_index": next_idx,
                "phase": "new",
                "due_count": 0,
                "unlearned_count": len(all_new_cards),
                "total_cards": total,
                "learned_cards": len(all_learned_cards)
            }

        # 3. PRIORITY 3: All current due and new cards completed! (Hoàn thành cả 2 điều kiện)
        else:
            min_future_due = min(future_due_dates) if future_due_dates else (all_learned_cards[0]["due"] if all_learned_cards and all_learned_cards[0].get("due") else None)
            
            wait_sec = 600
            wait_text = "10 phút nữa"
            if min_future_due:
                diff_sec = int((min_future_due - now_utc).total_seconds())
                wait_sec = max(60, diff_sec)
                
                hours = wait_sec // 3600
                minutes = (wait_sec % 3600) // 60
                days = hours // 24
                
                if days > 0:
                    rem_h = hours % 24
                    wait_text = f"{days} ngày {rem_h} giờ nữa" if rem_h > 0 else f"{days} ngày nữa"
                elif hours > 0:
                    wait_text = f"{hours} giờ {minutes} phút nữa" if minutes > 0 else f"{hours} giờ nữa"
                else:
                    wait_text = f"{max(1, minutes)} phút nữa"

            return {
                "next_index": -1,
                "phase": "completed",
                "is_all_completed": True,
                "next_due_in_seconds": wait_sec,
                "next_due_text": wait_text,
                "next_due_date": min_future_due.isoformat() if min_future_due else None,
                "due_count": 0,
                "unlearned_count": 0,
                "total_cards": total,
                "learned_cards": len(all_learned_cards)
            }

    elif mode == "review":
        deck_with_stats = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
        review_candidates = []
        for idx in range(total):
            if idx in ignored_indexes or idx in effective_answered:
                continue
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            if (c_stats.get("total") or 0) > 0:
                review_candidates.append(idx)

        if review_candidates:
            if random_enabled:
                import random
                return {"next_index": random.choice(review_candidates)}
            else:
                for idx in review_candidates:
                    if idx > current_index:
                        return {"next_index": idx}
                return {"next_index": review_candidates[0]}

        unanswered = [idx for idx in range(total) if idx not in effective_answered]
        if unanswered:
            if random_enabled:
                import random
                return {"next_index": random.choice(unanswered)}
            else:
                return {"next_index": unanswered[0]}

        return {"next_index": min(current_index + 1, total - 1)}

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
                return {"next_index": random.choice(top_n)["idx"]}
            else:
                candidates.sort(key=lambda x: (x["ratio"], -x["wrongs"]))
                return {"next_index": candidates[0]["idx"]}

        unanswered = [idx for idx in range(total) if idx not in effective_answered]
        if unanswered:
            if random_enabled:
                import random
                return {"next_index": random.choice(unanswered)}
            else:
                return {"next_index": unanswered[0]}

        return {"next_index": min(current_index + 1, total - 1)}

    elif mode == "flip":
        pool = [idx for idx in range(total) if idx not in effective_answered]
        if pool:
            if random_enabled:
                import random
                return {"next_index": random.choice(pool)}
            else:
                for idx in pool:
                    if idx > current_index:
                        return {"next_index": idx}
                return {"next_index": pool[0]}

        return {"next_index": min(current_index + 1, total - 1)}
        
    return {"next_index": min(current_index + 1, total - 1)}

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

