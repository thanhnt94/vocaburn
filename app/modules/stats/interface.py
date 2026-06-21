from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .models import UserDailyStats
from datetime import datetime, date, timedelta
from typing import Optional

class StatsInterface:
    @staticmethod
    async def record_activity(
        db: AsyncSession, 
        user_id: int, 
        is_correct: bool, 
        time_spent: int, 
        local_date_str: Optional[str] = None, 
        tz_offset: Optional[int] = None
    ):
        if local_date_str:
            try:
                local_dt = date.fromisoformat(local_date_str)
            except ValueError:
                local_dt = datetime.utcnow().date()
        else:
            if tz_offset is None:
                tz_offset = -420
            now_utc = datetime.utcnow()
            now_local = now_utc - timedelta(minutes=tz_offset)
            local_dt = now_local.date()
            
        today = datetime.combine(local_dt, datetime.min.time())
        
        result = await db.execute(
            select(UserDailyStats).where(
                UserDailyStats.user_id == user_id,
                UserDailyStats.date == today
            )
        )
        stats = result.scalar_one_or_none()
        
        if not stats:
            stats = UserDailyStats(
                user_id=user_id,
                date=today,
                questions_attempted=0,
                correct_answers=0,
                total_time_seconds=0,
                accuracy=0.0
            )
            db.add(stats)
        
        stats.questions_attempted = (stats.questions_attempted or 0) + 1
        if is_correct:
            stats.correct_answers = (stats.correct_answers or 0) + 1
        else:
            stats.correct_answers = stats.correct_answers or 0
        
        stats.total_time_seconds = (stats.total_time_seconds or 0) + time_spent
        
        correct_cnt = stats.correct_answers or 0
        attempted_cnt = stats.questions_attempted or 1
        stats.accuracy = (correct_cnt / attempted_cnt) * 100
        
        await db.commit()
        return stats

    @staticmethod
    async def revert_activity(
        db: AsyncSession, 
        user_id: int, 
        is_correct: bool, 
        time_spent: int, 
        local_date_str: Optional[str] = None, 
        tz_offset: Optional[int] = None
    ):
        if local_date_str:
            try:
                local_dt = date.fromisoformat(local_date_str)
            except ValueError:
                local_dt = datetime.utcnow().date()
        else:
            if tz_offset is None:
                tz_offset = -420
            now_utc = datetime.utcnow()
            now_local = now_utc - timedelta(minutes=tz_offset)
            local_dt = now_local.date()
            
        today = datetime.combine(local_dt, datetime.min.time())
        
        result = await db.execute(
            select(UserDailyStats).where(
                UserDailyStats.user_id == user_id,
                UserDailyStats.date == today
            )
        )
        stats = result.scalar_one_or_none()
        if stats:
            stats.questions_attempted = max(0, (stats.questions_attempted or 0) - 1)
            if is_correct:
                stats.correct_answers = max(0, (stats.correct_answers or 0) - 1)
            stats.total_time_seconds = max(0, (stats.total_time_seconds or 0) - time_spent)
            
            correct_cnt = stats.correct_answers or 0
            attempted_cnt = stats.questions_attempted or 0
            if attempted_cnt > 0:
                stats.accuracy = (correct_cnt / attempted_cnt) * 100
            else:
                stats.accuracy = 0.0
            await db.commit()
            return stats
        return None

    @staticmethod
    async def get_user_summary(db: AsyncSession, user_id: int):
        # Aggregate all-time stats
        result = await db.execute(
            select(
                func.sum(UserDailyStats.questions_attempted).label("total_questions"),
                func.avg(UserDailyStats.accuracy).label("avg_accuracy"),
                func.sum(UserDailyStats.total_time_seconds).label("total_time")
            ).where(UserDailyStats.user_id == user_id)
        )
        summary = result.first()
        
        return {
            "total_questions": summary.total_questions or 0,
            "avg_accuracy": round(summary.avg_accuracy or 0, 1),
            "total_time_hours": round((summary.total_time or 0) / 3600, 1)
        }
