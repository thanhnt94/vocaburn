import asyncio
import time
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import select, func
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.quiz.models import UserQuizGoal, UserDailyProgress, Quiz, Question, UserAnswer, QuizAttempt

async def profile_goals():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No users found")
            return
            
        print(f"Profiling goals for user: {user.username} (ID: {user.id})")
        
        t0 = time.perf_counter()
        
        # Original logic inside get_active_goals
        local_date = "2026-05-26"
        res = await db.execute(
            select(UserQuizGoal).filter(UserQuizGoal.user_id == user.id, UserQuizGoal.status == "active")
        )
        goals = res.scalars().all()
        print(f"Fetched {len(goals)} active goals.")
        
        goals_data = []
        for goal in goals:
            t_g0 = time.perf_counter()
            
            # Fetch quiz info
            quiz_res = await db.execute(select(Quiz).filter(Quiz.id == goal.quiz_id))
            quiz = quiz_res.scalar_one_or_none()
            
            # Count total questions in quiz
            q_count_res = await db.execute(select(func.count(Question.id)).filter(Question.quiz_id == goal.quiz_id))
            total_questions = q_count_res.scalar() or 0
            
            # Count total learned/answered questions by user
            learned_res = await db.execute(
                select(func.count(func.distinct(Question.id)))
                .join(UserAnswer, UserAnswer.question_id == Question.id)
                .join(QuizAttempt, QuizAttempt.id == UserAnswer.attempt_id)
                .filter(Question.quiz_id == goal.quiz_id, QuizAttempt.user_id == user.id)
            )
            total_learned = learned_res.scalar() or 0
            
            # Get today's progress
            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == local_date
                )
            )
            progress = prog_res.scalar_one_or_none()
            
            t_g1 = time.perf_counter()
            print(f"Goal {goal.id} (Quiz {goal.quiz_id}): {t_g1 - t_g0:.4f}s")
            
        total_time = time.perf_counter() - t0
        print(f"Total time: {total_time:.4f}s")

if __name__ == "__main__":
    asyncio.run(profile_goals())
