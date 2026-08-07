from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from .models import UserGamification, UserDailyActivity, XPTransaction
from datetime import datetime, timedelta, date
from typing import Optional

class GamificationInterface:
    @staticmethod
    async def add_xp(db: AsyncSession, user_id: int, amount: int, source: str = "unknown"):
        if amount <= 0:
            return {"level_up": False, "current_level": 1, "current_xp": 0}
            
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = result.scalar_one_or_none()
        if not user_stats:
            user_stats = UserGamification(user_id=user_id, xp=0, level=1)
            db.add(user_stats)
        
        user_stats.xp += amount
        # Simple level up logic: each level is 1000 XP
        new_level = (user_stats.xp // 1000) + 1
        level_up = new_level > user_stats.level
        user_stats.level = new_level
        
        # Log transaction
        tx = XPTransaction(user_id=user_id, amount=amount, source=source)
        db.add(tx)
        
        await db.commit()
        return {"level_up": level_up, "current_level": user_stats.level, "current_xp": user_stats.xp}

    @staticmethod
    async def revert_xp(db: AsyncSession, user_id: int, amount: int, source: str = "unknown"):
        if amount <= 0:
            return {"level_down": False, "current_level": 1, "current_xp": 0}
            
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = result.scalar_one_or_none()
        if user_stats:
            user_stats.xp = max(0, user_stats.xp - amount)
            new_level = (user_stats.xp // 1000) + 1
            level_down = new_level < user_stats.level
            user_stats.level = new_level
            
            # Delete the transaction if we find one
            tx_res = await db.execute(
                select(XPTransaction)
                .where(XPTransaction.user_id == user_id, XPTransaction.amount == amount, XPTransaction.source == source)
                .order_by(XPTransaction.id.desc())
            )
            tx = tx_res.scalars().first()
            if tx:
                await db.delete(tx)
                
            await db.commit()
            return {"level_down": level_down, "current_level": user_stats.level, "current_xp": user_stats.xp}
        return {"level_down": False, "current_level": 1, "current_xp": 0}

    @staticmethod
    async def calculate_pure_activity_streak(db: AsyncSession, user_id: int) -> int:
        from app.modules.deck.models import UserAnswer, DeckAttempt

        active_dates = set()

        ans_stmt = (
            select(func.date(UserAnswer.created_at))
            .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
            .where(DeckAttempt.user_id == user_id)
            .group_by(func.date(UserAnswer.created_at))
        )
        att_stmt = (
            select(func.date(DeckAttempt.started_at))
            .where(DeckAttempt.user_id == user_id)
            .group_by(func.date(DeckAttempt.started_at))
        )

        att_res = await db.execute(att_stmt)
        for row in att_res.all():
            val = row[0]
            if isinstance(val, str):
                try: active_dates.add(date.fromisoformat(val))
                except: pass
            elif isinstance(val, datetime): active_dates.add(val.date())
            elif isinstance(val, date): active_dates.add(val)

        ans_res = await db.execute(ans_stmt)
        for row in ans_res.all():
            val = row[0]
            if isinstance(val, str):
                try: active_dates.add(date.fromisoformat(val))
                except: pass
            elif isinstance(val, datetime): active_dates.add(val.date())
            elif isinstance(val, date): active_dates.add(val)

        # 2. Fetch distinct dates from UserDailyActivity
        act_stmt = select(UserDailyActivity.activity_date).where(UserDailyActivity.user_id == user_id)
        act_res = await db.execute(act_stmt)
        for row in act_res.all():
            if row[0]: active_dates.add(row[0])

        if not active_dates:
            return 0

        sorted_dates = sorted(list(active_dates), reverse=True)

        today_date = datetime.utcnow().date()
        yesterday_date = today_date - timedelta(days=1)

        # If user has no activity today or yesterday, streak is broken -> 0
        if sorted_dates[0] != today_date and sorted_dates[0] != yesterday_date:
            return 0

        # Count back-to-back consecutive days
        streak = 1
        current_date = sorted_dates[0]
        for d in sorted_dates[1:]:
            diff = (current_date - d).days
            if diff == 1:
                streak += 1
                current_date = d
            elif diff == 0:
                continue
            else:
                break

        return streak

    @staticmethod
    async def update_streak(db: AsyncSession, user_id: int, local_date_str: Optional[str] = None):
        activity_date = None
        if local_date_str:
            try: activity_date = date.fromisoformat(local_date_str)
            except ValueError: pass
        if not activity_date:
            activity_date = datetime.utcnow().date()

        # Record today's activity if not present
        act_res = await db.execute(
            select(UserDailyActivity).where(
                and_(
                    UserDailyActivity.user_id == user_id,
                    UserDailyActivity.activity_date == activity_date
                )
            )
        )
        if not act_res.scalar_one_or_none():
            new_act = UserDailyActivity(user_id=user_id, activity_date=activity_date)
            db.add(new_act)
            try:
                await db.flush()
            except Exception:
                pass

        res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = res.scalar_one_or_none()
        if not user_stats:
            user_stats = UserGamification(user_id=user_id, streak_count=0, last_activity=datetime.utcnow())
            db.add(user_stats)
            await db.flush()

        # Recalculate exact consecutive active days streak from DB history
        calculated_streak = await GamificationInterface.calculate_pure_activity_streak(db, user_id)
        user_stats.streak_count = calculated_streak
        user_stats.last_activity = datetime.utcnow()

        try:
            await db.commit()
        except Exception:
            await db.rollback()

        return user_stats.streak_count

    @staticmethod
    async def get_user_stats(db: AsyncSession, user_id: int):
        streak_val = await GamificationInterface.update_streak(db, user_id)
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        stats = result.scalar_one_or_none()
        if not stats:
            return {"xp": 0, "level": 1, "streak": streak_val, "badges": []}
        return {
            "xp": stats.xp,
            "level": stats.level,
            "streak": streak_val,
            "badges": stats.badges
        }

