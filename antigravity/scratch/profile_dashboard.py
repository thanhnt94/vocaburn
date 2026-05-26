import asyncio
import time
import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.quiz.models import QuizAttempt
from app.modules.gamification.interface import GamificationInterface
from app.modules.stats.interface import StatsInterface
from app.modules.notification.interface import NotificationInterface

async def profile():
    async with SessionLocal() as db:
        # Find first user
        result = await db.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No users found in database.")
            return
        
        print(f"Profiling dashboard for user: {user.username} (ID: {user.id})")
        
        t0 = time.perf_counter()
        
        # 1. QuizService.get_quizzes
        t_q0 = time.perf_counter()
        all_quizzes = await QuizService.get_quizzes(db)
        t_q1 = time.perf_counter()
        print(f"1. QuizService.get_quizzes: {t_q1 - t_q0:.4f}s (Fetched {len(all_quizzes)} quizzes)")
        
        # 2. QuizAttempt query
        t_qa0 = time.perf_counter()
        interaction_result = await db.execute(
            select(QuizAttempt.quiz_id, QuizAttempt.is_archived).where(QuizAttempt.user_id == user.id)
        )
        interaction_map = {r[0]: r[1] for r in interaction_result.all()}
        t_qa1 = time.perf_counter()
        print(f"2. QuizAttempt interaction query: {t_qa1 - t_qa0:.4f}s")
        
        # 3. Quiz processing loop
        t_loop0 = time.perf_counter()
        my_quizzes_data = []
        archived_quizzes_data = []
        discover_quizzes_data = []
        created_quizzes_data = []
        for q, count in all_quizzes:
            quiz_dict = {
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "cover_image": q.cover_image,
                "questions_count": count,
                "tags": [t.name for t in q.tags],
                "is_creator": q.creator_id == user.id
            }
            if q.creator_id == user.id or user.role == "admin":
                created_quizzes_data.append(quiz_dict)
            is_archived = interaction_map.get(q.id)
            if q.id in interaction_map:
                if is_archived:
                    archived_quizzes_data.append(quiz_dict)
                else:
                    my_quizzes_data.append(quiz_dict)
            else:
                discover_quizzes_data.append(quiz_dict)
        t_loop1 = time.perf_counter()
        print(f"3. Quiz loop: {t_loop1 - t_loop0:.4f}s")
        
        # 4. Concurrent gather
        t_gather0 = time.perf_counter()
        gamify_data, stats_summary, notifications, unread_count = await asyncio.gather(
            GamificationInterface.get_user_stats(db, user.id),
            StatsInterface.get_user_summary(db, user.id),
            NotificationInterface.get_latest(db, user.id),
            NotificationInterface.get_unread_count(db, user.id)
        )
        t_gather1 = time.perf_counter()
        print(f"4. Concurrent gather (stats, gamification, notifications): {t_gather1 - t_gather0:.4f}s")
        
        total_time = time.perf_counter() - t0
        print(f"\nTotal DB and Processing Time: {total_time:.4f}s")

if __name__ == "__main__":
    asyncio.run(profile())
