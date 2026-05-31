from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.quiz.services.excel_service import ExcelQuizService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.quiz.services.ai_service import ai_service
from app.modules.quiz.schemas import QuizSchema, QuestionSchema
from app.modules.quiz.models import UserDeckSettings
from app.modules.quiz.services.mcq_engine import MCQEngine
from app.modules.quiz.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Quiz"])

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


@router.post("/explain")
async def explain_question(data: dict):
    question_text = data.get("question")
    options = data.get("options", [])
    correct_answer = data.get("correct_answer")
    
    explanation = await ai_service.explain_question(question_text, options, correct_answer)
    return {"explanation": explanation}

@router.get("/{quiz_id}/mistakes")
async def get_quiz_mistakes(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer, Question
    result = await db.execute(
        select(Question).join(UserAnswer).filter(UserAnswer.is_correct == False, Question.quiz_id == quiz_id).distinct()
    )
    mistakes = result.scalars().all()
    return mistakes

@router.post("/record_answer")
async def record_answer(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer, Question, QuizAttempt, UserQuestionMastery
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface
    from sqlalchemy import and_, case

    user_id = int(request.cookies.get("user_id", 1)) # Default to 1 for demo
    is_correct = data.get("is_correct", False)
    time_spent = int(data.get("time_spent", 0))
    question_id = int(data.get("question_id"))
    local_date = data.get("local_date")

    # Map incoming rating or fall back to is_correct early
    rating_val = data.get("rating")
    if rating_val is not None:
        rating_val = int(rating_val)
    else:
        rating_val = 3 if is_correct else 1

    q_res = await db.execute(select(Question).filter(Question.id == question_id))
    question = q_res.scalar_one_or_none()
    
    goal_update_info = None
    mastery_update_info = None
    unlocked_badge_info = None
    is_originally_new = False

    if question:
        attempt_res = await db.execute(select(QuizAttempt).filter(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == question.quiz_id).order_by(QuizAttempt.id.desc()))
        attempt = attempt_res.scalar()
        if not attempt:
            attempt = QuizAttempt(user_id=user_id, quiz_id=question.quiz_id, mode="play")
            db.add(attempt)
            await db.flush()

        db_answer = UserAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            is_correct=is_correct,
            active_time=float(time_spent),
            rating=rating_val
        )
        db.add(db_answer)
        await db.flush()

        # --- FSRS v6 Spaced Repetition Mastery Levels ---
        is_practice = data.get("is_practice", False)
        
        if not is_practice:
            from fsrs import Card, Scheduler, Rating, State
            
            mastery_res = await db.execute(
                select(UserQuestionMastery).where(
                    UserQuestionMastery.user_id == user_id,
                    UserQuestionMastery.question_id == question_id
                )
            )
            mastery = mastery_res.scalar_one_or_none()
            if not mastery:
                is_originally_new = True
                mastery = UserQuestionMastery(
                    user_id=user_id,
                    question_id=question_id,
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
            
            # Run FSRS v6 scheduler
            scheduler = Scheduler()
            updated_card, review_log = scheduler.review_card(fsrs_card, rating_enum, now_utc)
            
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
            mastery.due = updated_card.due.replace(tzinfo=None)
            if updated_card.last_review:
                mastery.last_review = updated_card.last_review.replace(tzinfo=None)
                
            # Map box_level for gamification metrics & badges compatibility
            if mastery.state == 2: # Review
                mastery.box_level = 5 if (mastery.stability and mastery.stability >= 10.0) else 4
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
                
            next_intervals = {}
            for r_val, r_enum in [(1, Rating.Again), (2, Rating.Hard), (3, Rating.Good), (4, Rating.Easy)]:
                try:
                    card_copy, _ = scheduler.review_card(updated_card, r_enum, now_utc)
                    delta = card_copy.due - now_utc
                    if delta.total_seconds() < 60:
                        int_str = "<1m"
                    elif delta.total_seconds() < 3600:
                        int_str = f"{int(delta.total_seconds() / 60)}m"
                    elif delta.total_seconds() < 86400:
                        int_str = f"{int(delta.total_seconds() / 3600)}h"
                    else:
                        int_str = f"{int(delta.total_seconds() / 86400)}d"
                    next_intervals[r_val] = int_str
                except Exception:
                    next_intervals[r_val] = "soon"

            mastery_update_info = {
                "old_level": old_box_level,
                "new_level": new_box_level,
                "consecutive_correct": mastery.consecutive_correct,
                "level_up": new_box_level > old_box_level,
                "state": mastery.state,
                "stability": mastery.stability,
                "difficulty": mastery.difficulty,
                "due": mastery.due.isoformat() if mastery.due else None,
                "intervals": next_intervals
            }
        else:
            mastery_update_info = None
        
        # --- Goal Progress Tracking Logic ---
        from app.modules.quiz.models import UserQuizGoal, UserDailyProgress
        goal_res = await db.execute(
            select(UserQuizGoal).filter(
                UserQuizGoal.user_id == user_id, 
                UserQuizGoal.quiz_id == question.quiz_id, 
                UserQuizGoal.status == "active"
            )
        )
        goal = goal_res.scalar_one_or_none()
        if goal:

            today_str = local_date
            if not today_str:
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
            
            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == today_str
                )
            )
            progress = prog_res.scalar_one_or_none()
            if not progress:
                progress = UserDailyProgress(
                    goal_id=goal.id,
                    date=today_str,
                    count_done=0,
                    is_target_met=False
                )
                db.add(progress)
                await db.flush()
            # Only count toward goal if this is a BRAND NEW question in FSRS (never reviewed before by this user under FSRS)
            is_new_question = is_originally_new
            
            if is_new_question:
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
                msg = f"Limitless Learning! You are pushing limits today with {progress.count_done} questions! 🔥"
            elif remaining == 1:
                msg = "Outstanding! Just 1 question left to complete your daily goal! 🚀"
            else:
                msg = f"Excellent! You've done {progress.count_done}/{goal.daily_target} new questions today. Just {remaining} more to hit your goal, keep going! ⚡"
            
            # Only send goal toast update if this was a new question or target is already met (limitless mode)
            if is_new_question or progress.is_target_met:
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
                    "is_new_question": is_new_question
                }

        await db.commit()

    # --- Gamification Logic & Achievements Check ---
    session_streak = int(data.get("session_streak", 0))
    is_first_ever = data.get("is_first_ever", False)

    base_xp = 0
    if rating_val == 4:
        base_xp = 7
    elif rating_val == 3:
        base_xp = 6
    elif rating_val == 2:
        base_xp = 5
    else:
        base_xp = 1
        
    bonus_xp_gained = 0
    if is_first_ever:
        bonus_xp_gained += 10
    if session_streak >= 5:
        bonus_xp_gained += 1
        
    xp_gain = base_xp + bonus_xp_gained
    gamify_res = await GamificationInterface.add_xp(db, user_id, xp_gain, source="quiz_answer")
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
                select(func.count(UserAnswer.id)).join(QuizAttempt).where(QuizAttempt.user_id == user_id)
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
                select(QuizAttempt.id)
                .join(UserAnswer)
                .where(QuizAttempt.user_id == user_id)
                .group_by(QuizAttempt.id)
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
                    .join(QuizAttempt)
                    .where(
                        QuizAttempt.user_id == user_id,
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
                        select(UserQuizGoal.id).where(UserQuizGoal.user_id == user_id)
                    ),
                    UserDailyProgress.is_target_met == True
                )
            )
            if (goal_completed_res.scalar() or 0) >= 3:
                should_unlock = True
                
        elif badge.id == "card_master":
            mastered_cards_res = await db.execute(
                select(func.count(UserQuestionMastery.id)).where(
                    UserQuestionMastery.user_id == user_id,
                    UserQuestionMastery.box_level == 5
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
    question_res = await db.execute(
        select(Question.quiz_id).where(Question.id == question_id)
    )
    quiz_id_val = question_res.scalar()
    if quiz_id_val:
        total_q_res = await db.execute(
            select(func.count(Question.id)).where(Question.quiz_id == quiz_id_val)
        )
        total_q = total_q_res.scalar() or 0
        
        mastered_q_res = await db.execute(
            select(func.count(UserQuestionMastery.id)).join(Question).where(
                Question.quiz_id == quiz_id_val,
                UserQuestionMastery.user_id == user_id,
                UserQuestionMastery.box_level == 5
            )
        )
        mastered_q = mastered_q_res.scalar() or 0
        if total_q > 0 and mastered_q == total_q:
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


@router.get("/{quiz_id}/data")
async def get_quiz_data(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.quiz.models import QuizCollaborator
    
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    from app.modules.quiz.models import Question
    q_count_res = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    q_count = q_count_res.scalar()
    
    # Check if user is collaborator
    collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "instruction": quiz.instruction,
        "ai_prompt": quiz.ai_prompt,
        "creator_id": quiz.creator_id,
        "is_collaborator": is_collaborator,
        "questions_count": q_count,
        "tags": [t.name for t in quiz.tags]
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

@router.get("/{quiz_id}/play-data")
async def get_quiz_play_data(request: Request, quiz_id: int, mode: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    is_practice = mode in ("mcq", "typing", "listening")
    
    # Load user deck settings globally for FSRS & Practice
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == quiz_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()

    if is_practice:
        # Instant load: We do not need heavy question-level stats aggregation for practice modes!
        quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    else:
        quiz = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    # Skip heavy gamification stats & collaborator check for practice — not needed
    user_total_xp = 0
    is_collaborator = False
    if not is_practice:
        from app.modules.gamification.interface import GamificationInterface
        user_stats = await GamificationInterface.get_user_stats(db, user_id)
        user_total_xp = user_stats.get("xp", 0)
        
        from app.modules.quiz.models import QuizCollaborator
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
    
    # Skip mastery loading for practice mode — practice doesn't use FSRS state
    mastery_records = {}
    if not is_practice:
        from app.modules.quiz.models import UserQuestionMastery
        mastery_stmt = select(UserQuestionMastery).where(
            UserQuestionMastery.user_id == user_id,
            UserQuestionMastery.question_id.in_([q.id for q in quiz.questions])
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_records = {m.question_id: m for m in mastery_res.scalars().all()}
    
    # Check settings if practice mode
    practice_needs_setup = False
    practice_disabled = False
    active_pairs = []
    num_choices = 4
    
    if is_practice:
        raw_settings = None
        if user_sett and user_sett.settings:
            raw_settings = user_sett.settings
        elif quiz.practice_settings:
            raw_settings = quiz.practice_settings
            
        settings = migrate_practice_settings(raw_settings)
        mode_settings = settings.get(mode, {})
        
        if not mode_settings or not mode_settings.get("active_pairs"):
            creator_settings = migrate_practice_settings(quiz.practice_settings)
            creator_mode_settings = creator_settings.get(mode, {})
            
            creator_has_settings = creator_mode_settings and creator_mode_settings.get("active_pairs")
            if not creator_has_settings:
                is_owner = quiz.creator_id == user_id
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
            
    # Distractors and practice questions are now generated client-side to make deck loading instant.
    questions_list = []
    
    if is_practice:
        # Ultra-fast path for practice: just card data, no FSRS computation
        for q in quiz.questions:
            questions_list.append({
                "id": q.id,
                "content": q.content,
                "explanation": q.explanation,
                "ai_explanation": q.ai_explanation,
                "stats": None,
                "box_level": 1,
                "is_ignored": False,
                "fsrs": None,
                "options": [],
                "image": fix_static_urls(q.image),
                "audio": fix_static_urls(q.audio),
                "others": fix_static_urls(q.others)
            })
    else:
        from fsrs import Card, Scheduler, Rating, State
        scheduler = Scheduler()
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        
        for q in quiz.questions:
            m = mastery_records.get(q.id)
            
            m_state = m.state if m else 0
            m_step = m.step if m else 0
            m_stability = m.stability if m else None
            m_difficulty = m.difficulty if m else None
            m_due = m.due if m else datetime.utcnow()
            m_last_review = m.last_review if m else None
            m_box_level = m.box_level if m else 1
            
            # Build Card for FSRS interval estimation
            fsrs_card = build_fsrs_card(m, now_utc)
            
            intervals = {}
            for r_val, r_enum in [(1, Rating.Again), (2, Rating.Hard), (3, Rating.Good), (4, Rating.Easy)]:
                try:
                    card_copy, _ = scheduler.review_card(fsrs_card, r_enum, now_utc)
                    delta = card_copy.due - now_utc
                    if delta.total_seconds() < 60:
                        int_str = "<1m"
                    elif delta.total_seconds() < 3600:
                        int_str = f"{int(delta.total_seconds() / 60)}m"
                    elif delta.total_seconds() < 86400:
                        int_str = f"{int(delta.total_seconds() / 3600)}h"
                    else:
                        int_str = f"{int(delta.total_seconds() / 86400)}d"
                    intervals[r_val] = int_str
                except Exception:
                    intervals[r_val] = "soon"
                    
            questions_list.append({
                "id": q.id,
                "content": q.content,
                "explanation": q.explanation,
                "ai_explanation": q.ai_explanation,
                "stats": getattr(q, 'stats', None),
                "box_level": m_box_level,
                "is_ignored": m.is_ignored if m else False,
                "fsrs": {
                    "state": m_state,
                    "stability": m_stability,
                    "difficulty": m_difficulty,
                    "due": m_due.isoformat() if m_due else None,
                    "last_review": m_last_review.isoformat() if m_last_review else None,
                    "intervals": intervals
                },
                "options": [],
                "image": fix_static_urls(q.image),
                "audio": fix_static_urls(q.audio),
                "others": fix_static_urls(q.others)
            })
        
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "ai_prompt": quiz.ai_prompt,
        "instruction": quiz.instruction,
        "category_id": quiz.category_id,
        "creator_id": quiz.creator_id,
        "is_collaborator": is_collaborator,
        "user_total_xp": user_total_xp,
        "practice_needs_setup": practice_needs_setup,
        "practice_disabled": practice_disabled,
        "questions": questions_list,
        "user_settings": user_sett.settings if user_sett else None
    }

@router.get("/{quiz_id}/session")
async def get_quiz_session(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session: return None
    return {
        "mode": session.mode,
        "current_index": session.current_index,
        "state": json.loads(session.state_json) if session.state_json else {}
    }

@router.post("/{quiz_id}/session")
async def save_quiz_session(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session:
        session = QuizSession(quiz_id=quiz_id, user_id=user_id)
        db.add(session)
    
    session.mode = data.get("mode")
    session.current_index = data.get("current_index", 0)
    session.state_json = json.dumps(data.get("state", {}))
    await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}/session")
async def reset_quiz_session(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(delete(QuizSession).where(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/{quiz_id}/next-card")
async def get_next_card(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    mode = data.get("mode", "fsrs")
    answered_indexes = data.get("answered_indexes", [])
    current_index = data.get("current_index", 0)
    
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz:
        return JSONResponse(status_code=404, content={"error": "Quiz not found"})
        
    total = len(quiz.questions)
    if total == 0:
        return {"next_index": 0}
        
    if mode == "fsrs":
        from app.modules.quiz.models import UserQuestionMastery
        q_ids = [q.id for q in quiz.questions]
        mastery_res = await db.execute(
            select(UserQuestionMastery).where(
                UserQuestionMastery.user_id == user_id,
                UserQuestionMastery.question_id.in_(q_ids)
            )
        )
        mastery_map = {m.question_id: m for m in mastery_res.scalars().all()}
        
        now_utc = datetime.utcnow()
        
        due_cards = []
        for idx, q in enumerate(quiz.questions):
            m = mastery_map.get(q.id)
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
            for idx, q in enumerate(quiz.questions):
                m = mastery_map.get(q.id)
                is_new = not m or m.state == 0 or m.stability is None
                has_not_answered = idx not in answered_indexes
                if is_new and has_not_answered:
                    return {"next_index": idx}
                    
            for idx in range(total):
                if idx not in answered_indexes:
                    return {"next_index": idx}
                    
            return {"next_index": min(current_index + 1, total - 1)}
            
    elif mode == "sequential":
        found = -1
        for i in range(current_index + 1, total):
            if i not in answered_indexes:
                found = i
                break
        if found == -1:
            for i in range(0, current_index + 1):
                if i not in answered_indexes:
                    found = i
                    break
        next_index = found if found != -1 else min(current_index + 1, total - 1)
        return {"next_index": next_index}
        
    elif mode == "random":
        import random
        pool = [i for i in range(total) if i not in answered_indexes]
        if pool:
            return {"next_index": random.choice(pool)}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "unseen":
        quiz_with_stats = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
        for idx in range(current_index + 1, total):
            q = quiz_with_stats.questions[idx]
            q_stats = getattr(q, "stats", None) or {}
            if (q_stats.get("total") or 0) == 0 and idx not in answered_indexes:
                return {"next_index": idx}
        for idx in range(0, current_index + 1):
            q = quiz_with_stats.questions[idx]
            q_stats = getattr(q, "stats", None) or {}
            if (q_stats.get("total") or 0) == 0 and idx not in answered_indexes:
                return {"next_index": idx}
        for idx in range(total):
            if idx not in answered_indexes:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "review":
        quiz_with_stats = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
        for idx in range(current_index + 1, total):
            q = quiz_with_stats.questions[idx]
            q_stats = getattr(q, "stats", None) or {}
            total_attempts = q_stats.get("total") or 0
            correct_attempts = q_stats.get("correct") or 0
            if total_attempts - correct_attempts > 0 and idx not in answered_indexes:
                return {"next_index": idx}
        for idx in range(0, current_index + 1):
            q = quiz_with_stats.questions[idx]
            q_stats = getattr(q, "stats", None) or {}
            total_attempts = q_stats.get("total") or 0
            correct_attempts = q_stats.get("correct") or 0
            if total_attempts - correct_attempts > 0 and idx not in answered_indexes:
                return {"next_index": idx}
        for idx in range(total):
            if idx not in answered_indexes:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    elif mode == "hardest":
        quiz_with_stats = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
        best_idx = -1
        min_ratio = float('inf')
        max_wrongs = -1
        for idx in range(total):
            if idx in answered_indexes:
                continue
            q = quiz_with_stats.questions[idx]
            q_stats = getattr(q, "stats", None) or {}
            t = q_stats.get("total") or 0
            c = q_stats.get("correct") or 0
            wrongs = t - c
            if t > 0:
                ratio = c / t
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
            if idx not in answered_indexes:
                return {"next_index": idx}
        return {"next_index": min(current_index + 1, total - 1)}
        
    return {"next_index": min(current_index + 1, total - 1)}

async def _generate_ai_task(quiz_id: int, question_id: int, prompt_template: Optional[str] = None):
    from app.core.db import AsyncSession, engine
    from app.modules.quiz.models import Question, Quiz
    from app.modules.ai.services.gemini_service import GeminiService
    from sqlalchemy.orm import selectinload
    
    async with AsyncSession(engine) as db:
        result = await db.execute(
            select(Question)
            .filter(Question.id == question_id)
        )
        q = result.scalar_one_or_none()
        if not q: return
        
        gemini = await GeminiService.from_db(db)
        if not gemini.client:
            q.ai_explanation = "AI Service not configured."
            await db.commit()
            return

        try:
            if prompt_template:
                options_text = ""
                correct_answer_text = q.explanation or ""
                
                # Fetch quiz info for template
                quiz_res = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
                quiz = quiz_res.scalar_one_or_none()
                
                prompt = prompt_template \
                    .replace("{{question}}", q.content or "") \
                    .replace("{{options}}", options_text) \
                    .replace("{{correct_answer}}", correct_answer_text) \
                    .replace("{{global_instruction}}", quiz.instruction if quiz else "") \
                    .replace("{{quiz_title}}", quiz.title if quiz else "") \
                    .replace("{{quiz_description}}", quiz.description if quiz else "")
                
                for i in range(4):
                    prompt = prompt.replace(f"{{{{option_{chr(97+i)}}}}}", "")

                response = await gemini.client.aio.models.generate_content(
                    model=gemini.model_id,
                    contents=prompt
                )
                ai_response = response.text
                
                # Strip markdown wrappers if present
                ai_response = ai_response.strip()
                if ai_response.startswith("```markdown"):
                    ai_response = ai_response[len("```markdown"):].strip()
                elif ai_response.startswith("```"):
                    ai_response = ai_response[len("```"):].strip()
                
                if ai_response.endswith("```"):
                    ai_response = ai_response[:-3].strip()
                
                # Strip backticks around ruby tags
                ai_response = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', ai_response)
                    
            else:
                options_list = [o.content for o in q.options]
                correct_opt = next((o.content for o in q.options if o.is_correct), None)
                correct_text = correct_opt.content if correct_opt else "Unknown"
                ai_response = await gemini.generate_explanation(q.content, options_list, correct_text)
                
                # Also strip wrappers for default generation
                ai_response = ai_response.strip()
                if ai_response.startswith("```markdown"):
                    ai_response = ai_response[len("```markdown"):].strip()
                elif ai_response.startswith("```"):
                    ai_response = ai_response[len("```"):].strip()
                if ai_response.endswith("```"):
                    ai_response = ai_response[:-3].strip()
                
                # Strip backticks around ruby tags
                ai_response = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', ai_response)
            
            q.ai_explanation = ai_response
            await db.commit()
        except Exception as e:
            q.ai_explanation = f"AI Error: {str(e)}"
            await db.commit()

@router.post("/{quiz_id}/ask-ai")
async def ask_ai(quiz_id: int, payload: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    question_id = payload.get("question_id")
    from app.modules.quiz.models import Question, Quiz
    from app.modules.admin.interface import AdminInterface
    
    # Check if AI is enabled
    ai_config = await AdminInterface.get_ai_config(db)
    if not ai_config.get("enabled"):
        return {"error": "AI Analysis is disabled."}

    result = await db.execute(select(Question).filter(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q: return {"error": "Not found"}
    
    # If explanation already exists and no manual override, just return it
    if q.ai_explanation and "ai_explanation" not in payload:
        return {"ai_explanation": q.ai_explanation}

    # Manual explanation override (saving)
    if "ai_explanation" in payload:
        val = payload["ai_explanation"]
        if isinstance(val, str):
            val = val.strip()
        q.ai_explanation = val if val else None
        await db.commit()
        return {"ai_explanation": q.ai_explanation}
    
    # Background generation
    quiz_res = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    background_tasks.add_task(_generate_ai_task, quiz_id, question_id, quiz.ai_prompt if quiz else None)
    
    return {"status": "processing", "message": "AI analysis started in background."}

