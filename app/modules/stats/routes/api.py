from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.stats.services.analytics_service import AnalyticsService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.stats.interface import StatsInterface

router = APIRouter(tags=["Stats"])

@router.get("/stats/detailed")
async def get_detailed_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_user_detailed_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/leaderboard")
async def get_leaderboard(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_leaderboard(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/dashboard/data")
async def get_dashboard_data(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id_int = user.id
    
    # Use selectinload for quizzes and questions to avoid N+1
    all_quizzes = await QuizService.get_quizzes(db)
    
    # Get status from QuizAttempt (interacted and archived)
    from app.modules.quiz.models import QuizAttempt
    interaction_result = await db.execute(
        select(QuizAttempt.quiz_id, QuizAttempt.is_archived).where(QuizAttempt.user_id == user_id_int)
    )
    interaction_map = {r[0]: r[1] for r in interaction_result.all()}

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
            "is_creator": q.creator_id == user_id_int
        }
        
        if q.creator_id == user_id_int or user.role == "admin":
            created_quizzes_data.append(quiz_dict)
            
        is_archived = interaction_map.get(q.id)
        if q.id in interaction_map:
            if is_archived:
                archived_quizzes_data.append(quiz_dict)
            else:
                my_quizzes_data.append(quiz_dict)
        else:
            discover_quizzes_data.append(quiz_dict)
            
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.notification.interface import NotificationInterface

    # Fetch data concurrently for performance
    gamify_data, stats_summary, notifications, unread_count = await asyncio.gather(
        GamificationInterface.get_user_stats(db, user_id_int),
        StatsInterface.get_user_summary(db, user_id_int),
        NotificationInterface.get_latest(db, user_id_int),
        NotificationInterface.get_unread_count(db, user_id_int)
    )

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "my_quizzes": my_quizzes_data,
        "archived_quizzes": archived_quizzes_data,
        "discover_quizzes": discover_quizzes_data,
        "created_quizzes": created_quizzes_data,
        "gamify": gamify_data,
        "stats_summary": stats_summary,
        "notifications": notifications,
        "unread_count": unread_count
    }
