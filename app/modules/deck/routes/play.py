from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
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

def fix_static_urls(val):
    if not val:
        return val
    if isinstance(val, str):
        return val.replace("/static/uploads/", "/uploads/")
    if isinstance(val, dict):
        return {k: fix_static_urls(v) for k, v in val.items()}
    if isinstance(val, list):
        return [fix_static_urls(v) for v in val]
    return val

def build_fsrs_card(mastery, now_utc):
    from fsrs import Card, State
    state_map = {
        0: State.Learning,
        1: State.Learning,
        2: State.Review,
        3: State.Relearning
    }
    card_state = state_map.get(mastery.state if mastery else 0, State.Learning)
    if card_state in (State.Review, State.Relearning) and (not mastery or mastery.stability is None or mastery.difficulty is None):
        card_state = State.Learning
        
    fsrs_card = Card()
    if mastery:
        fsrs_card.state = card_state
        fsrs_card.step = mastery.step
        fsrs_card.stability = mastery.stability
        fsrs_card.difficulty = mastery.difficulty
        fsrs_card.due = mastery.due.replace(tzinfo=timezone.utc) if mastery.due else now_utc
        fsrs_card.last_review = mastery.last_review.replace(tzinfo=timezone.utc) if mastery.last_review else None
    else:
        fsrs_card.state = State.Learning
        fsrs_card.step = 0
        fsrs_card.stability = None
        fsrs_card.difficulty = None
        fsrs_card.due = now_utc
        fsrs_card.last_review = None
    return fsrs_card


def apply_stability_boost(card_copy, rating_val, scheduler) -> float:
    from fsrs import State
    stability = card_copy.stability
    if stability is None or card_copy.state != State.Review:
        return stability

    try:
        r_val = int(rating_val)
    except (TypeError, ValueError):
        r_val = 3

    # Calculate float_interval_days using the current stability
    float_interval_days = (stability / scheduler._FACTOR) * (
        (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
    )

    if float_interval_days < 1.0 and r_val > 1:
        # Boost mapping:
        # Rating 2 (Hard): boost by 2.0
        # Rating 3 (Good): boost by 3.5
        # Rating 4 (Easy): boost by 5.0
        boost_map = {
            2: 2.0,
            3: 3.5,
            4: 5.0
        }
        boost_factor = boost_map.get(r_val, 1.0)
        stability = stability * boost_factor

        # Ensure a minimum stability so stability doesn't get stuck near 0
        min_stability = 0.2
        if stability < min_stability:
            stability = min_stability

    return stability


def estimate_intervals(scheduler, card, now_utc) -> dict:
    from fsrs import Rating, State
    intervals = {}
    for r_val, r_enum in [(1, Rating.Again), (2, Rating.Hard), (3, Rating.Good), (4, Rating.Easy)]:
        try:
            card_copy, _ = scheduler.review_card(card, r_enum, now_utc)
            if card_copy.state == State.Review:
                # Apply stability boost if interval is sub-1-day
                card_copy.stability = apply_stability_boost(card_copy, r_val, scheduler)
                
                float_interval_days = (card_copy.stability / scheduler._FACTOR) * (
                    (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
                )
                float_interval_days = min(float_interval_days, float(scheduler.maximum_interval))
                float_interval_days = max(float_interval_days, 0.0)
                
                if float_interval_days < 1.0:
                    total_seconds = float_interval_days * 86400
                    if total_seconds < 60:
                        intervals[r_val] = "<1m"
                    elif total_seconds < 3600:
                        intervals[r_val] = f"{int(total_seconds / 60)}m"
                    else:
                        hours = int(total_seconds / 3600)
                        mins = int((total_seconds % 3600) / 60)
                        if mins > 0:
                            intervals[r_val] = f"{hours}h {mins}m"
                        else:
                            intervals[r_val] = f"{hours}h"
                else:
                    days = int(float_interval_days)
                    hours = int((float_interval_days - days) * 24)
                    if hours > 0:
                        intervals[r_val] = f"{days}d {hours}h"
                    else:
                        intervals[r_val] = f"{days}d"
            else:
                delta = card_copy.due - now_utc
                if delta.total_seconds() < 60:
                    intervals[r_val] = "<1m"
                elif delta.total_seconds() < 3600:
                    intervals[r_val] = f"{int(delta.total_seconds() / 60)}m"
                elif delta.total_seconds() < 86400:
                    intervals[r_val] = f"{int(delta.total_seconds() / 3600)}h"
                else:
                    intervals[r_val] = f"{int(delta.total_seconds() / 86400)}d"
        except Exception:
            intervals[r_val] = "soon"
    return intervals



@router.post("/explain")
async def explain_card(data: dict):
    card_text = data.get("card") or data.get("question")
    options = data.get("options", [])
    correct_answer = data.get("correct_answer")
    
    explanation = await ai_service.explain_card(card_text, options, correct_answer)
    return {"explanation": explanation}

@router.get("/{deck_id}/mistakes")
async def get_deck_mistakes(deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserAnswer, Flashcard
    result = await db.execute(
        select(Flashcard).join(UserAnswer).filter(UserAnswer.is_correct == False, Flashcard.deck_id == deck_id).distinct()
    )
    mistakes = result.scalars().all()
    return mistakes

@router.post("/record_answer")
async def record_answer(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserAnswer, Flashcard, DeckAttempt, UserCardMastery
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface
    from sqlalchemy import and_, case

    user_id = int(request.cookies.get("user_id", 1)) # Default to 1 for demo
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
        attempt_mode = "practice" if is_practice else "play"
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
        
        if not is_practice:
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
                if mastery.stability and mastery.stability >= 10.0:
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

            # Query first and last review timestamps for this user and card
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
                    DeckAttempt.user_id == user_id
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

        await db.commit()

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
    gamify_res = await GamificationInterface.add_xp(db, user_id, xp_gain, source="deck_answer")
    has_leveled_up = gamify_res["level_up"]
    current_level = gamify_res["current_level"]

    # Process daily goal bonus XP
    if goal_update_info and goal_update_info["bonus_xp"] > 0:
        bonus_res = await GamificationInterface.add_xp(db, user_id, goal_update_info["bonus_xp"], source="daily_goal_bonus")
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
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    if not user_gamify:
        user_gamify = UserGamification(user_id=user_id, xp=0, level=1, badges=[])
        db.add(user_gamify)
        await db.flush()

    already_earned = set(user_gamify.badges or [])
    badges_res = await db.execute(select(Badge))
    all_badges = badges_res.scalars().all()

    for badge in all_badges:
        if badge.id in already_earned:
            continue
        
        should_unlock = False
        if badge.id == "first_steps":
            ans_count_res = await db.execute(
                select(func.count(UserAnswer.id)).join(DeckAttempt).where(DeckAttempt.user_id == user_id)
            )
            if (ans_count_res.scalar() or 0) >= 1:
                should_unlock = True
                
        elif badge.id == "streak_starter":
            if user_gamify.streak_count >= 3 or (goal_update_info and goal_update_info["streak_count"] >= 3):
                should_unlock = True
                
        elif badge.id == "streak_legend":
            if user_gamify.streak_count >= 7 or (goal_update_info and goal_update_info["streak_count"] >= 7):
                should_unlock = True
                
        elif badge.id == "perfect_score":
            perf_attempt_res = await db.execute(
                select(DeckAttempt.id)
                .join(UserAnswer)
                .where(DeckAttempt.user_id == user_id)
                .group_by(DeckAttempt.id)
                .having(
                    and_(
                        func.count(UserAnswer.id) >= 5,
                        func.sum(case((UserAnswer.is_correct == True, 1), else_=0)) == func.count(UserAnswer.id)
                    )
                )
            )
            if perf_attempt_res.first():
                should_unlock = True
                
        elif badge.id == "speed_demon":
            if time_spent > 0 and time_spent <= 5 and is_correct:
                fast_correct_res = await db.execute(
                    select(func.count(UserAnswer.id))
                    .join(DeckAttempt)
                    .where(
                        DeckAttempt.user_id == user_id,
                        UserAnswer.is_correct == True,
                        UserAnswer.active_time <= 5.0,
                        UserAnswer.active_time > 0.0
                    )
                )
                if (fast_correct_res.scalar() or 0) >= 5:
                    should_unlock = True
                    
        elif badge.id == "goal_crusher":
            goal_completed_res = await db.execute(
                select(func.count(UserDailyProgress.id)).where(
                    UserDailyProgress.goal_id.in_(
                        select(UserDeckGoal.id).where(UserDeckGoal.user_id == user_id)
                    ),
                    UserDailyProgress.is_target_met == True
                )
            )
            if (goal_completed_res.scalar() or 0) >= 3:
                should_unlock = True
                
        elif badge.id == "card_master":
            mastered_cards_res = await db.execute(
                select(func.count(UserCardMastery.id)).where(
                    UserCardMastery.user_id == user_id,
                    UserCardMastery.box_level == 5
                )
            )
            if (mastered_cards_res.scalar() or 0) >= 10:
                should_unlock = True
        
        if should_unlock:
            new_badges = list(user_gamify.badges or [])
            new_badges.append(badge.id)
            user_gamify.badges = new_badges
            
            xp_reward = 150
            if badge.id == "first_steps": xp_reward = 100
            elif badge.id == "streak_starter": xp_reward = 250
            elif badge.id == "streak_legend": xp_reward = 500
            elif badge.id == "perfect_score": xp_reward = 300
            elif badge.id == "speed_demon": xp_reward = 200
            elif badge.id == "goal_crusher": xp_reward = 400
            elif badge.id == "card_master": xp_reward = 500
            
            gamify_res2 = await GamificationInterface.add_xp(db, user_id, xp_reward, source="badge_unlock")
            if gamify_res2["level_up"]:
                has_leveled_up = True
                current_level = gamify_res2["current_level"]
            
            await NotificationInterface.send(
                db, user_id,
                f"🏆 ACHIEVEMENT UNLOCKED: {badge.name}!",
                f"You unlocked the badge '{badge.name}' and earned +{xp_reward} XP! {badge.description}",
                "achievement"
            )
            
            unlocked_badge_info = {
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
                "xp_reward": xp_reward
            }
            break

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent)
    
    # Check if deck is 100% mastered
    deck_mastered = False
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

    user_id = int(request.cookies.get("user_id", 1))
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
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.deck.models import DeckCollaborator
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})
    
    from app.modules.deck.models import Flashcard
    c_count_res = await db.execute(select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id))
    c_count = c_count_res.scalar()
    
    # Check if user is collaborator
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    return {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "instruction": deck.instruction,
        "ai_prompt": deck.ai_prompt,
        "ai_prompt_hint": deck.ai_prompt_hint,
        "ai_prompt_mnemonic": deck.ai_prompt_mnemonic,
        "creator_id": deck.creator_id,
        "is_collaborator": is_collaborator,
        "cards_count": c_count,
        "questions_count": c_count, # compatibility
        "tags": [t.name for t in deck.tags]
    }

def migrate_practice_settings(settings: Optional[dict]) -> dict:
    if not settings:
        return {}
    if any(k in settings for k in ("mcq", "typing", "listening")):
        return settings
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    return {
        "mcq": {"active_pairs": active_pairs, "num_choices": num_choices},
        "typing": {"active_pairs": active_pairs},
        "listening": {"active_pairs": active_pairs, "num_choices": num_choices}
    }

@router.get("/{deck_id}/play-data")
async def get_deck_play_data(request: Request, deck_id: int, mode: Optional[str] = None, lightweight: Optional[bool] = None, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    if lightweight:
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
            "content": c.content,
            "explanation": c.explanation,
            "ai_explanation": c.ai_explanation,
            "hint": c.hint,
            "mnemonic": c.mnemonic,
            "image": fix_static_urls(c.image),
            "audio": fix_static_urls(c.audio),
            "others": fix_static_urls(c.others)
        } for c in deck.cards]
        
        return {
            "id": deck.id,
            "title": deck.title,
            "description": deck.description,
            "cover_image": fix_static_urls(deck.cover_image),
            "tags": [t.name for t in deck.tags] if deck.tags else [],
            "ai_prompt": deck.ai_prompt,
            "ai_prompt_hint": deck.ai_prompt_hint,
            "ai_prompt_mnemonic": deck.ai_prompt_mnemonic,
            "ai_prompts": deck.practice_settings.get("ai_prompts", []) if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else [],
            "instruction": deck.instruction,
            "category_id": deck.category_id,
            "creator_id": deck.creator_id,
            "cards": cards_list,
            "questions": cards_list
        }

    is_practice = mode in ("mcq", "typing", "listening")
    
    # Load user deck settings globally for FSRS & Practice
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()

    deck = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
    if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})
    
    # Fetch user total XP and check if collaborator
    from app.modules.gamification.interface import GamificationInterface
    user_stats = await GamificationInterface.get_user_stats(db, user_id)
    user_total_xp = user_stats.get("xp", 0)
    
    from app.modules.deck.models import DeckCollaborator
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None

    # Query today's XP, today's time, and all-time time
    from app.modules.gamification.models import XPTransaction
    from app.modules.deck.models import UserAnswer, DeckAttempt
    
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

    
    # Skip mastery loading for practice mode — practice doesn't use FSRS state
    mastery_records = {}
    review_times_map = {}
    if not is_practice:
        from app.modules.deck.models import UserCardMastery, UserAnswer, DeckAttempt
        mastery_stmt = select(UserCardMastery).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id.in_([c.id for c in deck.cards])
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_records = {m.card_id: m for m in mastery_res.scalars().all()}
        
        # Bulk query first and last review timestamps for this user and deck's cards
        review_times_stmt = select(
            UserAnswer.card_id,
            func.min(UserAnswer.created_at),
            func.max(UserAnswer.created_at)
        ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(
             DeckAttempt.user_id == user_id,
             UserAnswer.card_id.in_([c.id for c in deck.cards])
         ).group_by(UserAnswer.card_id)
        
        review_times_res = await db.execute(review_times_stmt)
        review_times_map = {row[0]: (row[1], row[2]) for row in review_times_res.all()}
    
    # Check settings if practice mode
    practice_needs_setup = False
    practice_disabled = False
    active_pairs = []
    num_choices = 4
    
    if is_practice:
        raw_settings = None
        if user_sett and user_sett.settings:
            raw_settings = user_sett.settings
        elif deck.practice_settings:
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
        for c in deck.cards:
            cards_list.append({
                "id": c.id,
                "content": c.content,
                "explanation": c.explanation,
                "ai_explanation": c.ai_explanation,
                "hint": c.hint,
                "mnemonic": c.mnemonic,
                "stats": getattr(c, "stats", None),
                "box_level": 1,
                "is_ignored": False,
                "fsrs": None,
                "options": [],
                "image": fix_static_urls(c.image),
                "audio": fix_static_urls(c.audio),
                "others": fix_static_urls(c.others)
            })
    else:
        from fsrs import Card, Scheduler, Rating, State
        scheduler = Scheduler(enable_fuzzing=False)
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        
        # Pre-calculate brand new card intervals
        new_card = build_fsrs_card(None, now_utc)
        default_new_intervals = estimate_intervals(scheduler, new_card, now_utc)
                
        for c in deck.cards:
            m = mastery_records.get(c.id)
            
            m_state = m.state if m else 0
            m_step = m.step if m else 0
            m_stability = m.stability if m else None
            m_difficulty = m.difficulty if m else None
            m_due = m.due if m else datetime.utcnow()
            m_last_review = m.last_review if m else None
            m_box_level = m.box_level if m else 1
            
            is_new = (m is None) or (m_state == 0) or (m_stability is None)
            
            if is_new:
                intervals = default_new_intervals
            else:
                # Build Card for FSRS interval estimation
                fsrs_card = build_fsrs_card(m, now_utc)
                intervals = estimate_intervals(scheduler, fsrs_card, now_utc)
                        
            r_times = review_times_map.get(c.id)
            first_learned = r_times[0] if r_times else None
            last_reviewed = r_times[1] if r_times else None

            cards_list.append({
                "id": c.id,
                "content": c.content,
                "explanation": c.explanation,
                "ai_explanation": c.ai_explanation,
                "hint": c.hint,
                "mnemonic": c.mnemonic,
                "stats": getattr(c, 'stats', None),
                "box_level": m_box_level,
                "is_ignored": m.is_ignored if m else False,
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
                "image": fix_static_urls(c.image),
                "audio": fix_static_urls(c.audio),
                "others": fix_static_urls(c.others)
            })
        
    return {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "ai_prompt": deck.ai_prompt,
        "ai_prompt_hint": deck.ai_prompt_hint,
        "ai_prompt_mnemonic": deck.ai_prompt_mnemonic,
        "ai_prompts": deck.practice_settings.get("ai_prompts", []) if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else [],
        "instruction": deck.instruction,
        "category_id": deck.category_id,
        "creator_id": deck.creator_id,
        "is_collaborator": is_collaborator,
        "user_total_xp": user_total_xp,
        "user_today_xp": user_today_xp,
        "user_today_time": user_today_time,
        "user_all_time_time": user_all_time_time,
        "practice_needs_setup": practice_needs_setup,
        "practice_disabled": practice_disabled,
        "cards": cards_list,
        "questions": cards_list, # compatibility
        "user_settings": user_sett.settings if user_sett else None
    }


@router.get("/{deck_id}/session")
async def get_deck_session(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(DeckSession).filter(DeckSession.deck_id == deck_id, DeckSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session: return None
    return {
        "mode": session.mode,
        "current_index": session.current_index,
        "state": json.loads(session.state_json) if session.state_json else {}
    }

@router.post("/{deck_id}/session")
async def save_deck_session(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(DeckSession).filter(DeckSession.deck_id == deck_id, DeckSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session:
        session = DeckSession(deck_id=deck_id, user_id=user_id)
        db.add(session)
    
    session.mode = data.get("mode")
    session.current_index = data.get("current_index", 0)
    session.state_json = json.dumps(data.get("state", {}))
    await db.commit()
    return {"status": "ok"}

@router.delete("/{deck_id}/session")
async def reset_deck_session(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckSession
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(delete(DeckSession).where(DeckSession.deck_id == deck_id, DeckSession.user_id == user_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/{deck_id}/next-card")
async def get_next_card(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    mode = data.get("mode", "fsrs")
    answered_indexes = data.get("answered_indexes", [])
    current_index = data.get("current_index", 0)
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    total = len(deck.cards)
    if total == 0:
        return {"next_index": 0}
        
    from app.modules.deck.models import UserCardMastery
    c_ids = [c.id for c in deck.cards]
    mastery_res = await db.execute(
        select(UserCardMastery).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.card_id.in_(c_ids)
        )
    )
    mastery_map = {m.card_id: m for m in mastery_res.scalars().all()}
    
    ignored_indexes = set()
    for idx, c in enumerate(deck.cards):
        m = mastery_map.get(c.id)
        if m and getattr(m, 'is_ignored', False):
            ignored_indexes.add(idx)
            
    effective_answered = set(answered_indexes) | ignored_indexes
        
    if mode == "fsrs":
        now_utc = datetime.utcnow()
        
        due_cards = []
        for idx, c in enumerate(deck.cards):
            if idx in ignored_indexes:
                continue
                
            m = mastery_map.get(c.id)
            if not m or m.state == 0 or m.stability is None:
                continue
                
            is_due = (m.due - timedelta(seconds=30)) <= now_utc
            
            has_answered = idx in answered_indexes
            if has_answered and not is_due:
                continue
                
            if is_due:
                due_cards.append({"idx": idx, "stability": m.stability or 0.0})
                
        if due_cards:
            due_cards.sort(key=lambda x: x["stability"])
            next_index = due_cards[0]["idx"]
            return {"next_index": next_index}
        else:
            for idx, c in enumerate(deck.cards):
                if idx in ignored_indexes:
                    continue
                m = mastery_map.get(c.id)
                is_new = not m or m.state == 0 or m.stability is None
                has_not_answered = idx not in effective_answered
                if is_new and has_not_answered:
                    return {"next_index": idx}
                    
            for idx in range(total):
                if idx not in effective_answered:
                    return {"next_index": idx}
                    
            return {"next_index": min(current_index + 1, total - 1)}
            
    elif mode == "new":
        # First, find cards that are new (state == 0 or no mastery) and have not been answered in this session
        for idx, c in enumerate(deck.cards):
            if idx in ignored_indexes:
                continue
            m = mastery_map.get(c.id)
            is_new = not m or m.state == 0 or m.stability is None
            if is_new and idx not in effective_answered:
                return {"next_index": idx}
                
        # Fallback 1: if no new cards are left, check if any FSRS cards are due
        now_utc = datetime.utcnow()
        due_cards = []
        for idx, c in enumerate(deck.cards):
            if idx in ignored_indexes:
                continue
            m = mastery_map.get(c.id)
            if not m or m.state == 0 or m.stability is None:
                continue
            is_due = (m.due - timedelta(seconds=30)) <= now_utc
            if is_due and idx not in answered_indexes:
                due_cards.append({"idx": idx, "stability": m.stability or 0.0})
        if due_cards:
            due_cards.sort(key=lambda x: x["stability"])
            return {"next_index": due_cards[0]["idx"]}
            
        # Fallback 2: any unanswered cards
        for idx in range(total):
            if idx not in effective_answered:
                return {"next_index": idx}
                
        return {"next_index": min(current_index + 1, total - 1)}
            
    elif mode == "sequential":
        found = -1
        for i in range(current_index + 1, total):
            if i not in effective_answered:
                found = i
                break
        if found == -1:
            for i in range(0, current_index + 1):
                if i not in effective_answered:
                    found = i
                    break
        next_index = found if found != -1 else min(current_index + 1, total - 1)
        return {"next_index": next_index}
        
    elif mode == "random":
        import random
        pool = [i for i in range(total) if i not in effective_answered]
        if pool:
            return {"next_index": random.choice(pool)}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "unseen":
        deck_with_stats = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
        for idx in range(current_index + 1, total):
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            if (c_stats.get("total") or 0) == 0 and idx not in effective_answered:
                return {"next_index": idx}
        for idx in range(0, current_index + 1):
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            if (c_stats.get("total") or 0) == 0 and idx not in effective_answered:
                return {"next_index": idx}
        for idx in range(total):
            if idx not in effective_answered:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "review":
        deck_with_stats = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
        for idx in range(current_index + 1, total):
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            total_attempts = c_stats.get("total") or 0
            correct_attempts = c_stats.get("correct") or 0
            if total_attempts - correct_attempts > 0 and idx not in effective_answered:
                return {"next_index": idx}
        for idx in range(0, current_index + 1):
            c = deck_with_stats.cards[idx]
            c_stats = getattr(c, "stats", None) or {}
            total_attempts = c_stats.get("total") or 0
            correct_attempts = c_stats.get("correct") or 0
            if total_attempts - correct_attempts > 0 and idx not in effective_answered:
                return {"next_index": idx}
        for idx in range(total):
            if idx not in effective_answered:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "hardest":
        deck_with_stats = await DeckService.get_deck_with_stats(db, deck_id, user_id=user_id)
        best_idx = -1
        min_ratio = float('inf')
        max_wrongs = -1
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
                if ratio < min_ratio:
                    min_ratio = ratio
                    max_wrongs = wrongs
                    best_idx = idx
                elif ratio == min_ratio and wrongs > max_wrongs:
                    max_wrongs = wrongs
                    best_idx = idx
        if best_idx != -1:
            return {"next_index": best_idx}
        for idx in range(total):
            if idx not in effective_answered:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    return {"next_index": min(current_index + 1, total - 1)}

async def _generate_ai_task(deck_id: int, card_id: int, prompt_template: Optional[str] = None):
    from app.core.db import AsyncSession, engine
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
    if field == "hint":
        template = deck.ai_prompt_hint if deck else None
    elif field == "mnemonic":
        template = deck.ai_prompt_mnemonic if deck else None
    elif field == "explanation":
        template = deck.ai_prompt if deck else None
    else:
        # Custom prompt! Retrieve it from deck.practice_settings["ai_prompts"]
        template = None
        if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
            prompts = deck.practice_settings.get("ai_prompts", [])
            for p in prompts:
                if p.get("id") == field:
                    template = p.get("prompt")
                    break
        
    if not template or not template.strip():
        return ""
        
    # Format options
    options_text = ""
    if card.options:
        options_text = ", ".join([o.content for o in card.options])
        
    correct_answer_text = card.explanation or ""
    if card.options:
        correct_opt = next((o for o in card.options if o.is_correct), None)
        if correct_opt:
            correct_answer_text = correct_opt.content
            
    prompt = template \
        .replace("{{question}}", card.content or "") \
        .replace("{{card}}", card.content or "") \
        .replace("{{options}}", options_text) \
        .replace("{{correct_answer}}", correct_answer_text) \
        .replace("{{global_instruction}}", (deck.instruction if deck else "") or "") \
        .replace("{{quiz_title}}", (deck.title if deck else "") or "") \
        .replace("{{deck_title}}", (deck.title if deck else "") or "") \
        .replace("{{quiz_description}}", (deck.description if deck else "") or "") \
        .replace("{{deck_description}}", (deck.description if deck else "") or "")
        
    for i in range(4):
        prompt = prompt.replace(f"{{{{option_{chr(97+i)}}}}}", "")
        
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
async def ask_ai(deck_id: int, payload: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    card_id = payload.get("card_id", payload.get("question_id"))
    field = payload.get("field", "explanation") # explanation, hint, mnemonic, or custom ID
    force = payload.get("force", False)
    sync = payload.get("sync", False)
    
    from app.modules.deck.models import Flashcard
    from app.modules.admin.interface import AdminInterface
    from sqlalchemy.orm.attributes import flag_modified
    
    # Check if AI is enabled
    ai_config = await AdminInterface.get_ai_config(db)
    if not ai_config.get("enabled"):
        return {"error": "AI Services are disabled."}

    result = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = result.scalar_one_or_none()
    if not c: return {"error": "Not found"}
    
    # Manual Save Override
    if field == "explanation" and "ai_explanation" in payload:
        val = payload["ai_explanation"]
        c.ai_explanation = val.strip() if isinstance(val, str) else val
        await db.commit()
        return {"ai_explanation": c.ai_explanation, "content": c.ai_explanation}
    elif field == "hint" and "hint" in payload:
        val = payload["hint"]
        c.hint = val.strip() if isinstance(val, str) else val
        await db.commit()
        return {"hint": c.hint, "content": c.hint}
    elif field == "mnemonic" and "mnemonic" in payload:
        val = payload["mnemonic"]
        c.mnemonic = val.strip() if isinstance(val, str) else val
        await db.commit()
        return {"mnemonic": c.mnemonic, "content": c.mnemonic}
    elif field not in ["explanation", "hint", "mnemonic"] and "content" in payload:
        val = payload["content"]
        if not c.others:
            c.others = {}
        if "ai_responses" not in c.others:
            c.others["ai_responses"] = {}
        c.others["ai_responses"][field] = val.strip() if isinstance(val, str) else val
        flag_modified(c, "others")
        await db.commit()
        return {"content": c.others["ai_responses"][field], "ai_explanation": c.others["ai_responses"][field]}
        
    # Return Cached values
    if not force:
        if field == "explanation" and c.ai_explanation:
            return {"ai_explanation": c.ai_explanation, "content": c.ai_explanation}
        elif field == "hint" and c.hint:
            return {"hint": c.hint, "content": c.hint}
        elif field == "mnemonic" and c.mnemonic:
            return {"mnemonic": c.mnemonic, "content": c.mnemonic}
        elif field not in ["explanation", "hint", "mnemonic"]:
            if c.others and isinstance(c.others, dict) and "ai_responses" in c.others:
                if field in c.others["ai_responses"] and c.others["ai_responses"][field]:
                    return {"ai_explanation": c.others["ai_responses"][field], "content": c.others["ai_responses"][field]}
            
    # Check template availability
    deck_res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    template = None
    if deck:
        if field == "hint":
            template = deck.ai_prompt_hint
        elif field == "mnemonic":
            template = deck.ai_prompt_mnemonic
        elif field == "explanation":
            template = deck.ai_prompt
        else:
            if deck.practice_settings and isinstance(deck.practice_settings, dict):
                prompts = deck.practice_settings.get("ai_prompts", [])
                for p in prompts:
                    if p.get("id") == field:
                        template = p.get("prompt")
                        break
    if not template or not template.strip():
        return {"error": "Không có prompt cấu hình cho tab AI này. Vui lòng thiết lập trong phần chỉnh sửa bộ thẻ."}

    # Sync Generation
    if sync:
        content = await _generate_ai_content_sync(db, deck_id, card_id, field)
        if field == "hint":
            c.hint = content
        elif field == "mnemonic":
            c.mnemonic = content
        elif field == "explanation":
            c.ai_explanation = content
        else:
            if not c.others:
                c.others = {}
            if "ai_responses" not in c.others:
                c.others["ai_responses"] = {}
            c.others["ai_responses"][field] = content
            flag_modified(c, "others")
        await db.commit()
        
        # Return field response
        if field == "hint":
            return {"hint": content, "content": content}
        elif field == "mnemonic":
            return {"mnemonic": content, "content": content}
        else:
            return {"ai_explanation": content, "content": content}
            
    # Background Generation
    background_tasks.add_task(_generate_ai_task, deck_id, card_id, field)
    return {"status": "processing", "message": f"AI {field} generation started in background."}
