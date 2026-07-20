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
    
    # Check if user is collaborator
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None

    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"

    if not deck.is_public and deck.creator_id != user_id and user_id != 1 and not is_collaborator and not is_admin:
        return JSONResponse(status_code=403, content={"error": "This is a private deck"})
    
    from app.modules.deck.models import Flashcard
    c_count_res = await db.execute(select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id))
    c_count = c_count_res.scalar()
    
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
        "category_name": deck.category.name if deck.category else "General"
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

@router.get("/quick-play-data")
async def get_quick_play_data(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
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
        
        is_new = (m is None) or (m_state == 0) or (m_stability is None)
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
    user_id = int(request.cookies.get("user_id", 1))
    
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
        } for c in deck.cards]
        
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
                "ai_explanation": c.others.get("ai_explanation") if c.others else None,
                "hint": c.others.get("hint") if c.others else None,
                "mnemonic": c.others.get("mnemonic") if c.others else None,
                "stats": getattr(c, "stats", None),
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
        "practice_needs_setup": practice_needs_setup,
        "practice_disabled": practice_disabled,
        "cards": cards_list,
        "questions": cards_list, # compatibility
        "practice_settings": deck.practice_settings,
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
    random_enabled = data.get("random_enabled", False)

    deck = await DeckService.get_deck_by_id_with_cards(db, deck_id)
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

    if mode == "roadmap":
        from app.modules.deck.models import UserDeckSettings
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none()
        settings = user_sett.settings if (user_sett and user_sett.settings) else {}
        roadmap_daily_new = int(settings.get("roadmap_daily_new", 10))

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        from app.modules.deck.models import UserAnswer, DeckAttempt
        min_answer_sub = select(
            UserAnswer.card_id,
            func.min(UserAnswer.created_at).label("min_created")
        ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == user_id)\
         .group_by(UserAnswer.card_id).subquery()

        new_learned_today = await db.scalar(
            select(func.count(min_answer_sub.c.card_id))
            .join(Flashcard, min_answer_sub.c.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id == deck_id,
                min_answer_sub.c.min_created >= today_start
            )
        ) or 0

        if new_learned_today < roadmap_daily_new:
            new_cards = []
            for idx, c in enumerate(deck.cards):
                if idx in ignored_indexes:
                    continue
                m = mastery_map.get(c.id)
                is_new = not m or m.state == 0 or m.stability is None
                if is_new and idx not in effective_answered:
                    new_cards.append(idx)
            if new_cards:
                if random_enabled:
                    import random
                    return {"next_index": random.choice(new_cards), "phase": "new"}
                else:
                    return {"next_index": new_cards[0], "phase": "new"}

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
            if random_enabled:
                import random
                next_index = random.choice(due_cards)["idx"]
                return {"next_index": next_index, "phase": "review"}
            else:
                due_cards.sort(key=lambda x: x["stability"])
                return {"next_index": due_cards[0]["idx"], "phase": "review"}

        unanswered = [idx for idx in range(total) if idx not in effective_answered]
        if unanswered:
            if random_enabled:
                import random
                return {"next_index": random.choice(unanswered), "phase": "free"}
            else:
                return {"next_index": unanswered[0], "phase": "free"}

        return {"next_index": min(current_index + 1, total - 1), "phase": "free"}

    elif mode == "fsrs":
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
            if random_enabled:
                import random
                next_index = random.choice(due_cards)["idx"]
            else:
                due_cards.sort(key=lambda x: x["stability"])
                next_index = due_cards[0]["idx"]
            return {"next_index": next_index}
        else:
            new_cards = []
            for idx, c in enumerate(deck.cards):
                if idx in ignored_indexes:
                    continue
                m = mastery_map.get(c.id)
                is_new = not m or m.state == 0 or m.stability is None
                has_not_answered = idx not in effective_answered
                if is_new and has_not_answered:
                    new_cards.append(idx)
            if new_cards:
                if random_enabled:
                    import random
                    return {"next_index": random.choice(new_cards)}
                else:
                    return {"next_index": new_cards[0]}

            unanswered = [idx for idx in range(total) if idx not in effective_answered]
            if unanswered:
                if random_enabled:
                    import random
                    return {"next_index": random.choice(unanswered)}
                else:
                    return {"next_index": unanswered[0]}

            return {"next_index": min(current_index + 1, total - 1)}

    elif mode == "new":
        new_cards = []
        for idx, c in enumerate(deck.cards):
            if idx in ignored_indexes:
                continue
            m = mastery_map.get(c.id)
            is_new = not m or m.state == 0 or m.stability is None
            if is_new and idx not in effective_answered:
                new_cards.append(idx)

        if new_cards:
            if random_enabled:
                import random
                return {"next_index": random.choice(new_cards)}
            else:
                return {"next_index": new_cards[0]}

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
            if random_enabled:
                import random
                return {"next_index": random.choice(due_cards)["idx"]}
            else:
                due_cards.sort(key=lambda x: x["stability"])
                return {"next_index": due_cards[0]["idx"]}

        unanswered = [idx for idx in range(total) if idx not in effective_answered]
        if unanswered:
            if random_enabled:
                import random
                return {"next_index": random.choice(unanswered)}
            else:
                return {"next_index": unanswered[0]}

        return {"next_index": min(current_index + 1, total - 1)}

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


# ── Card Contributions & Community discussion routes ──
from typing import List
from app.modules.deck.models import CardContribution, ContributionLike, Flashcard, FlashcardDeck
from app.modules.auth.models import User
from app.modules.deck.schemas import ContributionCreate, ContributionResponse, ContributionStatusUpdate

@router.get("/question/{card_id}/contributions", response_model=List[ContributionResponse])
async def get_card_contributions(card_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    stmt = (
        select(CardContribution)
        .where(CardContribution.card_id == card_id, CardContribution.parent_id == None)
        .options(
            selectinload(CardContribution.user),
            selectinload(CardContribution.replies).selectinload(CardContribution.user)
        )
        .order_by(CardContribution.created_at.asc())
    )
    result = await db.execute(stmt)
    contributions = result.scalars().all()
    
    # Compute is_liked_by_me
    all_ids = []
    for c in contributions:
        all_ids.append(c.id)
        for r in c.replies:
            all_ids.append(r.id)
            
    liked_ids = set()
    if all_ids:
        likes_stmt = select(ContributionLike.contribution_id).where(
            ContributionLike.user_id == user_id,
            ContributionLike.contribution_id.in_(all_ids)
        )
        likes_res = await db.execute(likes_stmt)
        liked_ids = {row[0] for row in likes_res.fetchall()}
        
    res = []
    for c in contributions:
        res.append({
            "id": c.id,
            "card_id": c.card_id,
            "user_id": c.user_id,
            "parent_id": c.parent_id,
            "type": c.type,
            "content": c.content,
            "status": c.status,
            "likes_count": c.likes_count,
            "is_liked_by_me": c.id in liked_ids,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user": {
                "id": c.user.id if c.user else 0,
                "username": c.user.username if c.user else "Deleted User",
                "full_name": c.user.full_name if c.user else "",
                "role": c.user.role if c.user else "user"
            },
            "replies": [
                {
                    "id": r.id,
                    "card_id": r.card_id,
                    "user_id": r.user_id,
                    "parent_id": r.parent_id,
                    "type": r.type,
                    "content": r.content,
                    "status": r.status,
                    "likes_count": r.likes_count,
                    "is_liked_by_me": r.id in liked_ids,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "user": {
                        "id": r.user.id if r.user else 0,
                        "username": r.user.username if r.user else "Deleted User",
                        "full_name": r.user.full_name if r.user else "",
                        "role": r.user.role if r.user else "user"
                    },
                    "replies": []
                } for r in sorted(c.replies, key=lambda x: x.created_at)
            ]
        })
    return res

@router.post("/question/{card_id}/contributions", response_model=ContributionResponse)
async def create_card_contribution(
    card_id: int, 
    payload: ContributionCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    user_id = int(request.cookies.get("user_id", 1))
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    card = await db.get(Flashcard, card_id)
    if not card:
        return JSONResponse({"detail": "Card not found"}, status_code=404)
        
    new_contrib = CardContribution(
        card_id=card_id,
        user_id=user_id,
        parent_id=payload.parent_id,
        type=payload.type,
        content=payload.content,
        status="active"
    )
    db.add(new_contrib)
    await db.commit()
    await db.refresh(new_contrib)
    
    contrib_res = await db.execute(
        select(CardContribution)
        .where(CardContribution.id == new_contrib.id)
        .options(selectinload(CardContribution.user))
    )
    contrib_loaded = contrib_res.scalar()
    
    return {
        "id": contrib_loaded.id,
        "card_id": contrib_loaded.card_id,
        "user_id": contrib_loaded.user_id,
        "parent_id": contrib_loaded.parent_id,
        "type": contrib_loaded.type,
        "content": contrib_loaded.content,
        "status": contrib_loaded.status,
        "likes_count": contrib_loaded.likes_count,
        "is_liked_by_me": False,
        "created_at": contrib_loaded.created_at.isoformat() if contrib_loaded.created_at else None,
        "user": {
            "id": contrib_loaded.user.id if contrib_loaded.user else 0,
            "username": contrib_loaded.user.username if contrib_loaded.user else "Deleted User",
            "full_name": contrib_loaded.user.full_name if contrib_loaded.user else "",
            "role": contrib_loaded.user.role if contrib_loaded.user else "user"
        },
        "replies": []
    }

@router.post("/contributions/{contribution_id}/like")
async def like_contribution(contribution_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    like_stmt = select(ContributionLike).where(
        ContributionLike.user_id == user_id,
        ContributionLike.contribution_id == contribution_id
    )
    like_res = await db.execute(like_stmt)
    like_obj = like_res.scalar_one_or_none()
    
    if like_obj:
        await db.delete(like_obj)
        contrib.likes_count = max(0, contrib.likes_count - 1)
        liked = False
    else:
        new_like = ContributionLike(user_id=user_id, contribution_id=contribution_id)
        db.add(new_like)
        contrib.likes_count += 1
        liked = True
        
    await db.commit()
    return {"liked": liked, "likes_count": contrib.likes_count}

@router.delete("/contributions/{contribution_id}")
async def delete_contribution(contribution_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    if contrib.user_id != user_id and user.role != 'admin':
        return JSONResponse({"detail": "Permission denied"}, status_code=403)
        
    await db.delete(contrib)
    await db.commit()
    return {"status": "success"}

@router.put("/contributions/{contribution_id}/status")
async def update_contribution_status(
    contribution_id: int, 
    payload: ContributionStatusUpdate, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    user_id = int(request.cookies.get("user_id", 1))
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    is_authorized = False
    if user.role == 'admin':
        is_authorized = True
    else:
        card = await db.get(Flashcard, contrib.card_id)
        deck = await db.get(FlashcardDeck, card.deck_id) if card else None
        if deck and deck.creator_id == user_id:
            is_authorized = True
            
    if not is_authorized:
        return JSONResponse({"detail": "Permission denied. Only Admins or Deck Creators can update status."}, status_code=403)
        
    contrib.status = payload.status
    await db.commit()
    return {"status": "success", "new_status": contrib.status}


async def get_deck_roadmap_status_helper(db: AsyncSession, user_id: int, deck_id: int, settings: dict) -> dict:
    roadmap_active = settings.get("roadmap_active", False)
    roadmap_daily_new = int(settings.get("roadmap_daily_new", 10))
    roadmap_daily_review_max = int(settings.get("roadmap_daily_review_max", 50))
    
    from app.modules.deck.models import Flashcard, UserCardMastery, UserAnswer, DeckAttempt
    total_cards = await db.scalar(
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id)
    ) or 0
    
    # We count studied cards as those with state > 0 in mastery
    learned_cards = await db.scalar(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0
        )
    ) or 0
    
    unlearned_cards = max(0, total_cards - learned_cards)
    
    import math
    days_left = math.ceil(unlearned_cards / roadmap_daily_new) if roadmap_daily_new > 0 else 0
    estimated_completion_date = (datetime.utcnow() + timedelta(days=days_left)).strftime("%Y-%m-%d")
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
    .where(DeckAttempt.user_id == user_id)\
    .group_by(UserAnswer.card_id).subquery()
    
    new_learned_today = await db.scalar(
        select(func.count(min_answer_sub.c.card_id))
        .join(Flashcard, min_answer_sub.c.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created >= today_start
        )
    ) or 0
    
    review_completed_today = await db.scalar(
        select(func.count(func.distinct(UserAnswer.card_id)))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .join(min_answer_sub, UserAnswer.card_id == min_answer_sub.c.card_id)
        .where(
            DeckAttempt.user_id == user_id,
            Flashcard.deck_id == deck_id,
            UserAnswer.created_at >= today_start,
            min_answer_sub.c.min_created < today_start
        )
    ) or 0
    
    review_due_today = await db.scalar(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0,
            UserCardMastery.due <= datetime.utcnow()
        )
    ) or 0

    # Calculate streak and 7-day activity map
    active_dates_res = await db.execute(
        select(func.date(UserAnswer.created_at))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .where(
            DeckAttempt.user_id == user_id,
            Flashcard.deck_id == deck_id
        )
        .group_by(func.date(UserAnswer.created_at))
        .order_by(func.date(UserAnswer.created_at).desc())
    )
    active_dates = []
    for row in active_dates_res.all():
        val = row[0]
        if not val:
            continue
        if isinstance(val, str):
            try:
                active_dates.append(date.fromisoformat(val))
            except Exception:
                pass
        elif isinstance(val, datetime):
            active_dates.append(val.date())
        elif isinstance(val, date):
            active_dates.append(val)

    streak = 0
    if active_dates:
        today_date = datetime.utcnow().date()
        yesterday_date = today_date - timedelta(days=1)
        if active_dates[0] == today_date or active_dates[0] == yesterday_date:
            streak = 1
            current_date = active_dates[0]
            for date_val in active_dates[1:]:
                if (current_date - date_val).days == 1:
                    streak += 1
                    current_date = date_val
                elif (current_date - date_val).days == 0:
                    continue
                else:
                    break

    today_date = datetime.utcnow().date()
    seven_days = []
    for i in range(6, -1, -1):
        d = today_date - timedelta(days=i)
        seven_days.append({
            "date": d.strftime("%Y-%m-%d"),
            "day_name": d.strftime("%a"),
            "active": d in active_dates
        })
    
    return {
        "roadmap_active": roadmap_active,
        "roadmap_daily_new": roadmap_daily_new,
        "roadmap_daily_review_max": roadmap_daily_review_max,
        "total_cards": total_cards,
        "learned_cards": learned_cards,
        "unlearned_cards": unlearned_cards,
        "days_left": days_left,
        "estimated_completion_date": estimated_completion_date,
        "new_learned_today": new_learned_today,
        "new_target_today": roadmap_daily_new,
        "review_completed_today": review_completed_today,
        "review_due_today": review_due_today,
        "streak": streak,
        "seven_days": seven_days
    }


@router.get("/roadmap/decks")
async def get_roadmap_decks(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    user_setts_res = await db.execute(
        select(UserDeckSettings).where(UserDeckSettings.user_id == user_id)
    )
    user_setts = user_setts_res.scalars().all()
    
    active_roadmaps = []
    from app.modules.deck.models import FlashcardDeck
    for sett in user_setts:
        s_dict = sett.settings or {}
        if s_dict.get("roadmap_active", False):
            deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == sett.deck_id))
            deck = deck_res.scalar_one_or_none()
            if deck:
                status = await get_deck_roadmap_status_helper(db, user_id, deck.id, s_dict)
                # Resolve cover image url
                from .media_resolver import get_sso_server_url, resolve_central_url
                sso_url = await get_sso_server_url(db)
                cover_image = resolve_central_url(deck.cover_image, sso_url) if deck.cover_image else None
                active_roadmaps.append({
                    "deck_id": deck.id,
                    "title": deck.title,
                    "description": deck.description,
                    "cover_image": cover_image,
                    "status": status
                })
                
    return {"decks": active_roadmaps}


@router.get("/{deck_id}/roadmap-status")
async def get_deck_roadmap_status(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    
    status = await get_deck_roadmap_status_helper(db, user_id, deck_id, settings)
    return status

