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


@router.get("/stats")
async def get_quiz_stats(db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer
    
    # 1. Overall accuracy
    total_res = await db.execute(select(func.count(UserAnswer.id)))
    total = total_res.scalar()
    
    correct_res = await db.execute(select(func.count(UserAnswer.id)).filter(UserAnswer.is_correct == True))
    correct = correct_res.scalar()
    
    accuracy = (correct / total * 100) if total > 0 else 0
    
    # 2. Activity by day (last 7 days)
    activity_res = await db.execute(
        select(func.date(UserAnswer.created_at), func.count(UserAnswer.id))
        .group_by(func.date(UserAnswer.created_at))
        .order_by(func.date(UserAnswer.created_at))
        .limit(7)
    )
    activity = activity_res.all()
    
    return {
        "overall_accuracy": accuracy,
        "total_answers": total,
        "correct_answers": correct,
        "activity_data": activity
    }

@router.post("/goals")
async def create_or_update_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal
    user_id = int(request.cookies.get("user_id", 1))
    quiz_id = int(data.get("quiz_id"))
    daily_target = int(data.get("daily_target", 5))

    # Check if goal exists
    res = await db.execute(
        select(UserQuizGoal).filter(UserQuizGoal.user_id == user_id, UserQuizGoal.quiz_id == quiz_id)
    )
    goal = res.scalar_one_or_none()
    if goal:
        goal.daily_target = daily_target
        goal.status = "active"
    else:
        goal = UserQuizGoal(
            user_id=user_id,
            quiz_id=quiz_id,
            daily_target=daily_target,
            status="active"
        )
        db.add(goal)
    
    await db.commit()
    return {"status": "ok", "goal_id": goal.id, "daily_target": goal.daily_target}

@router.get("/goals/active")
async def get_active_goals(request: Request, local_date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal, UserDailyProgress, Quiz, Question, UserAnswer, QuizAttempt, UserQuestionMastery
    from sqlalchemy.orm import joinedload
    import math

    user_id = int(request.cookies.get("user_id", 1))
    if not local_date:
        local_date = datetime.utcnow().strftime("%Y-%m-%d")

    # Fetch active goals with joinedload of Quiz to avoid N+1
    res = await db.execute(
        select(UserQuizGoal)
        .options(joinedload(UserQuizGoal.quiz))
        .filter(UserQuizGoal.user_id == user_id, UserQuizGoal.status == "active")
    )
    goals = res.scalars().all()

    if not goals:
        return []

    goal_ids = [goal.id for goal in goals]
    quiz_ids = [goal.quiz_id for goal in goals]

    # Bulk query daily progress
    prog_res = await db.execute(
        select(UserDailyProgress).filter(
            UserDailyProgress.goal_id.in_(goal_ids),
            UserDailyProgress.date == local_date
        )
    )
    progress_map = {p.goal_id: p for p in prog_res.scalars().all()}

    # Bulk query total questions count grouped by quiz_id
    q_count_res = await db.execute(
        select(Question.quiz_id, func.count(Question.id))
        .filter(Question.quiz_id.in_(quiz_ids))
        .group_by(Question.quiz_id)
    )
    q_count_map = {r[0]: r[1] for r in q_count_res.all()}

    # Bulk query learned count grouped by quiz_id via user_card_mastery (instant index lookups)
    learned_res = await db.execute(
        select(Question.quiz_id, func.count(UserQuestionMastery.id))
        .join(UserQuestionMastery, UserQuestionMastery.question_id == Question.id)
        .filter(Question.quiz_id.in_(quiz_ids), UserQuestionMastery.user_id == user_id)
        .group_by(Question.quiz_id)
    )
    learned_map = {r[0]: r[1] for r in learned_res.all()}

    goals_data = []
    for goal in goals:
        quiz = goal.quiz
        if not quiz:
            continue
            
        total_questions = q_count_map.get(goal.quiz_id, 0)
        total_learned = learned_map.get(goal.quiz_id, 0)
        
        progress = progress_map.get(goal.id)
        done_today = progress.count_done if progress else 0
        is_target_met = progress.is_target_met if progress else False
        
        remaining_qs = max(0, total_questions - total_learned)
        days_remaining_est = math.ceil(remaining_qs / goal.daily_target) if goal.daily_target > 0 else 0
        
        goals_data.append({
            "goal_id": goal.id,
            "quiz_id": goal.quiz_id,
            "quiz_title": quiz.title,
            "cover_image": quiz.cover_image,
            "total_questions": total_questions,
            "total_learned": total_learned,
            "daily_target": goal.daily_target,
            "done_today": done_today,
            "is_target_met": is_target_met,
            "streak_count": goal.streak_count,
            "days_remaining_est": days_remaining_est
        })
        
    return goals_data

@router.post("/goals/remove")
async def remove_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal
    user_id = int(request.cookies.get("user_id", 1))
    quiz_id = int(data.get("quiz_id"))
    
    await db.execute(
        delete(UserQuizGoal).where(UserQuizGoal.user_id == user_id, UserQuizGoal.quiz_id == quiz_id)
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/gamification/badges")
async def get_user_badges(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.quiz.models import UserAnswer, QuizAttempt, UserQuizGoal, UserDailyProgress, UserQuestionMastery
    from app.modules.auth.services.auth_service import AuthService
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Get user gamification model
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    unlocked_badge_ids = set(user_gamify.badges or []) if user_gamify else set()
    
    # Get all badges
    badges_res = await db.execute(select(Badge))
    all_badges = badges_res.scalars().all()
    
    badges_list = []
    for badge in all_badges:
        is_unlocked = badge.id in unlocked_badge_ids
        progress = 0
        if is_unlocked:
            progress = 100
        else:
            if badge.id == "first_steps":
                ans_res = await db.execute(
                    select(func.count(UserAnswer.id)).join(QuizAttempt).where(QuizAttempt.user_id == user_id)
                )
                cnt = ans_res.scalar() or 0
                progress = min(100, int((cnt / 1) * 100))
            elif badge.id == "streak_starter":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 3) * 100))
            elif badge.id == "streak_legend":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 7) * 100))
            elif badge.id == "perfect_score":
                progress = 0
            elif badge.id == "speed_demon":
                fast_res = await db.execute(
                    select(func.count(UserAnswer.id))
                    .join(QuizAttempt)
                    .where(
                        QuizAttempt.user_id == user_id,
                        UserAnswer.is_correct == True,
                        UserAnswer.active_time <= 5.0,
                        UserAnswer.active_time > 0.0
                    )
                )
                cnt = fast_res.scalar() or 0
                progress = min(100, int((cnt / 5) * 100))
            elif badge.id == "goal_crusher":
                goals_res = await db.execute(
                    select(func.count(UserDailyProgress.id)).where(
                        UserDailyProgress.goal_id.in_(
                            select(UserQuizGoal.id).where(UserQuizGoal.user_id == user_id)
                        ),
                        UserDailyProgress.is_target_met == True
                    )
                )
                cnt = goals_res.scalar() or 0
                progress = min(100, int((cnt / 3) * 100))
            elif badge.id == "card_master":
                mastered_res = await db.execute(
                    select(func.count(UserQuestionMastery.id)).where(
                        UserQuestionMastery.user_id == user_id,
                        UserQuestionMastery.box_level == 5
                    )
                )
                cnt = mastered_res.scalar() or 0
                progress = min(100, int((cnt / 10) * 100))

        badges_list.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "criteria_type": badge.criteria_type,
            "criteria_value": badge.criteria_value,
            "is_unlocked": is_unlocked,
            "progress": progress
        })
        
    return {
        "badges": badges_list,
        "total_unlocked": len(unlocked_badge_ids),
        "total_count": len(all_badges)
    }

@router.get("/stats/heatmap")
async def get_heatmap_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.models import UserDailyStats

    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=365)
    
    heatmap_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_date
    ).order_by(UserDailyStats.date)
    
    results = await db.execute(heatmap_stmt)
    data = []
    for row in results.all():
        day_val = row[0]
        if isinstance(day_val, str):
            date_str = day_val[:10]
        elif day_val:
            date_str = day_val.strftime("%Y-%m-%d")
        else:
            date_str = ""
            
        data.append({
            "date": date_str,
            "count": row[1] or 0
        })
        
    return data

@router.get("/stats/weekly-report")
async def get_weekly_report(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.models import UserDailyStats

    from sqlalchemy import desc
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    
    # Current week (last 7 days)
    start_cur = today - timedelta(days=6)
    cur_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    )
    cur_res = (await db.execute(cur_stmt)).one_or_none()
    
    # Previous week (prior 7 days)
    start_prev = today - timedelta(days=13)
    end_prev = today - timedelta(days=7)
    prev_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_prev,
        UserDailyStats.date <= end_prev
    )
    prev_res = (await db.execute(prev_stmt)).one_or_none()
    
    cur_q = cur_res.total_q or 0 if cur_res and cur_res.total_q else 0
    cur_correct = cur_res.total_correct or 0 if cur_res and cur_res.total_correct else 0
    cur_time = cur_res.total_time or 0 if cur_res and cur_res.total_time else 0
    cur_accuracy = round((cur_correct / cur_q * 100), 1) if cur_q > 0 else 0
    
    prev_q = prev_res.total_q or 0 if prev_res and prev_res.total_q else 0
    prev_correct = prev_res.total_correct or 0 if prev_res and prev_res.total_correct else 0
    prev_accuracy = round((prev_correct / prev_q * 100), 1) if prev_q > 0 else 0
    
    # Calculate deltas
    q_delta = cur_q - prev_q
    q_pct_change = round((q_delta / prev_q * 100), 1) if prev_q > 0 else 100.0 if cur_q > 0 else 0.0
    accuracy_delta = round(cur_accuracy - prev_accuracy, 1)
    
    # Best active weekday in last 7 days
    best_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    ).order_by(desc(UserDailyStats.questions_attempted)).limit(1)
    best_res = (await db.execute(best_stmt)).first()
    
    best_day = "None"
    if best_res and best_res[0]:
        dt = best_res[0]
        if isinstance(dt, str):
            try:
                dt = datetime.strptime(dt[:10], "%Y-%m-%d")
            except Exception:
                pass
        if isinstance(dt, (datetime, date)):
            best_day = dt.strftime("%A")
        
    insights = []
    if cur_q == 0:
        insights = [
            "We noticed you haven't answered any questions this week. Set a simple goal of 5 cards today to kickstart your streak! 🚀",
            "Try studying at the same time each day to build a powerful long-term learning habit."
        ]
    else:
        insights.append(f"Awesome velocity! You attempted {cur_q} questions this week. Keep up this incredible momentum! 🔥")
        if accuracy_delta > 0:
            insights.append(f"Precision Boost! Your accuracy increased by {accuracy_delta}% compared to last week. Your retrieval speed is solid. 🎯")
        elif accuracy_delta < 0:
            insights.append("Focus Tip: Your accuracy fell slightly. Try turning on 'Incorrect Mistakes' learning mode to iron out weak cards. 🧠")
        else:
            insights.append("Great consistency! Your learning accuracy is holding perfectly steady. 📈")
            
        if cur_time > 1200:
            insights.append(f"Deep Focus: You spent {round(cur_time/60, 1)} minutes in deep study mode. Excellent focus stamina! ⏱️")
        else:
            insights.append("Habit Tip: Even 2 minutes of flashcard reviews daily triggers active recall and prevents forgetting! ⚡")
            
    return {
        "current_week": {
            "questions": cur_q,
            "accuracy": cur_accuracy,
            "time_minutes": round(cur_time / 60, 1)
        },
        "previous_week": {
            "questions": prev_q,
            "accuracy": prev_accuracy
        },
        "deltas": {
            "questions_change_pct": q_pct_change,
            "questions_change_absolute": q_delta,
            "accuracy_change": accuracy_delta
        },
        "best_day": best_day,
        "ai_insights": insights
    }

@router.get("/quizzes/{quiz_id}/mastery")
async def get_quiz_mastery(quiz_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserQuestionMastery, Question
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Count total questions in the quiz
    q_count_res = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    total_questions = q_count_res.scalar() or 0
    
    # Get all mastered cards for this quiz
    mastery_stmt = select(
        UserQuestionMastery.box_level,
        func.count(UserQuestionMastery.id)
    ).join(Question, UserQuestionMastery.question_id == Question.id)\
     .where(Question.quiz_id == quiz_id, UserQuestionMastery.user_id == user_id)\
     .group_by(UserQuestionMastery.box_level)
     
    results = await db.execute(mastery_stmt)
    
    mastery_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in mastery_counts:
            mastery_counts[lvl] = row[1]
            
    unattempted = max(0, total_questions - sum(mastery_counts.values()))
    mastery_counts[1] += unattempted # Treat unattempted questions as Level 1 (New)
    
    return {
        "new": mastery_counts[1],
        "learning": mastery_counts[2],
        "familiar": mastery_counts[3] + mastery_counts[4],
        "mastered": mastery_counts[5],
        "total": total_questions
    }

@router.get("/stats/leitner")
async def get_global_leitner_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserQuestionMastery, Question
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Query count of questions grouped by box_level
    stmt = select(
        UserQuestionMastery.box_level,
        func.count(UserQuestionMastery.id)
    ).where(UserQuestionMastery.user_id == user_id).group_by(UserQuestionMastery.box_level)
    
    results = await db.execute(stmt)
    
    box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in box_counts:
            box_counts[lvl] = row[1]
            
    total_tracked = sum(box_counts.values())
    mastery_percentage = round((box_counts[5] / total_tracked * 100), 1) if total_tracked > 0 else 0
    
    # We can also get a list of the user's hardest cards (e.g. up to 5 cards in Box 1)
    hardest_cards_stmt = select(Question)\
        .join(UserQuestionMastery, Question.id == UserQuestionMastery.question_id)\
        .where(UserQuestionMastery.user_id == user_id, UserQuestionMastery.box_level == 1)\
        .limit(5)
        
    hardest_cards_res = await db.execute(hardest_cards_stmt)
    hardest_cards = [{
        "id": q.id,
        "content": q.content,
        "explanation": q.explanation,
        "quiz_id": q.quiz_id
    } for q in hardest_cards_res.scalars().all()]
    
    return {
        "box_distribution": [
            {"box": 1, "count": box_counts[1], "label": "Box 1: Hard"},
            {"box": 2, "count": box_counts[2], "label": "Box 2: Learning"},
            {"box": 3, "count": box_counts[3], "label": "Box 3: Familiar"},
            {"box": 4, "count": box_counts[4], "label": "Box 4: Proficient"},
            {"box": 5, "count": box_counts[5], "label": "Box 5: Mastered"}
        ],
        "total_tracked": total_tracked,
        "mastery_percentage": mastery_percentage,
        "hardest_cards": hardest_cards
    }

@router.get("/stats/speed-accuracy")
async def get_speed_accuracy_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserAnswer, QuizAttempt
    from sqlalchemy import func, case
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Run database-level aggregation to bin and summarize speeds
    stmt = select(
        func.sum(case((UserAnswer.active_time <= 3.0, 1), else_=0)).label("fast_total"),
        func.sum(case(((UserAnswer.active_time <= 3.0) & UserAnswer.is_correct, 1), else_=0)).label("fast_correct"),
        
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0), 1), else_=0)).label("optimal_total"),
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0) & UserAnswer.is_correct, 1), else_=0)).label("optimal_correct"),
        
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0), 1), else_=0)).label("calculated_total"),
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0) & UserAnswer.is_correct, 1), else_=0)).label("calculated_correct"),
        
        func.sum(case((UserAnswer.active_time > 15.0, 1), else_=0)).label("deep_total"),
        func.sum(case(((UserAnswer.active_time > 15.0) & UserAnswer.is_correct, 1), else_=0)).label("deep_correct"),
        
        func.sum(case((UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_correct"),
        func.sum(case((UserAnswer.is_correct, 1), else_=0)).label("count_correct"),
        
        func.sum(case((~UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_wrong"),
        func.sum(case((~UserAnswer.is_correct, 1), else_=0)).label("count_wrong"),
        
        func.count().label("total_answers_analyzed")
    ).join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)\
     .where(QuizAttempt.user_id == user_id, UserAnswer.active_time > 0)
     
    results = await db.execute(stmt)
    row = results.first()
    
    # Safe fallback if there are no answers or SQLite returns all Nulls
    if not row or not row.total_answers_analyzed:
        return {
            "bins": [
                {"bin": "fast", "label": "Fast (0-3s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "optimal", "label": "Optimal (3-7s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "calculated", "label": "Calculated (7-15s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "deep", "label": "Deep (15s+)", "accuracy": 0.0, "total": 0, "correct": 0}
            ],
            "avg_speed_correct": 0.0,
            "avg_speed_wrong": 0.0,
            "total_answers_analyzed": 0
        }
        
    # Extract values
    fast_total = row.fast_total or 0
    fast_correct = row.fast_correct or 0
    optimal_total = row.optimal_total or 0
    optimal_correct = row.optimal_correct or 0
    calculated_total = row.calculated_total or 0
    calculated_correct = row.calculated_correct or 0
    deep_total = row.deep_total or 0
    deep_correct = row.deep_correct or 0
    
    sum_time_correct = row.sum_time_correct or 0.0
    count_correct = row.count_correct or 0
    sum_time_wrong = row.sum_time_wrong or 0.0
    count_wrong = row.count_wrong or 0
    total_answers_analyzed = row.total_answers_analyzed or 0
    
    bin_data = [
        {
            "bin": "fast",
            "label": "Fast (0-3s)",
            "accuracy": round((fast_correct / fast_total * 100), 1) if fast_total > 0 else 0.0,
            "total": fast_total,
            "correct": fast_correct
        },
        {
            "bin": "optimal",
            "label": "Optimal (3-7s)",
            "accuracy": round((optimal_correct / optimal_total * 100), 1) if optimal_total > 0 else 0.0,
            "total": optimal_total,
            "correct": optimal_correct
        },
        {
            "bin": "calculated",
            "label": "Calculated (7-15s)",
            "accuracy": round((calculated_correct / calculated_total * 100), 1) if calculated_total > 0 else 0.0,
            "total": calculated_total,
            "correct": calculated_correct
        },
        {
            "bin": "deep",
            "label": "Deep (15s+)",
            "accuracy": round((deep_correct / deep_total * 100), 1) if deep_total > 0 else 0.0,
            "total": deep_total,
            "correct": deep_correct
        }
    ]
    
    avg_speed_correct = round(sum_time_correct / count_correct, 1) if count_correct > 0 else 0.0
    avg_speed_wrong = round(sum_time_wrong / count_wrong, 1) if count_wrong > 0 else 0.0
    
    return {
        "bins": bin_data,
        "avg_speed_correct": avg_speed_correct,
        "avg_speed_wrong": avg_speed_wrong,
        "total_answers_analyzed": total_answers_analyzed
    }

