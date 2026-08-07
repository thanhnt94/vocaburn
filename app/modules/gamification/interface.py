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
    async def sync_and_get_streak(db: AsyncSession, user_id: int) -> int:
        from app.modules.deck.models import UserAnswer, DeckGoal

        activity_date = datetime.utcnow().date()
        
        # 1. Ensure today's UserDailyActivity exists if user has any activity
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

        # 2. Collect all active dates from UserAnswer and UserDailyActivity
        ans_stmt = (
            select(func.date(UserAnswer.created_at))
            .where(UserAnswer.user_id == user_id)
            .group_by(func.date(UserAnswer.created_at))
            .order_by(func.date(UserAnswer.created_at).desc())
        )
        ans_res = await db.execute(ans_stmt)
        active_dates = set()
        for row in ans_res.all():
            val = row[0]
            if isinstance(val, str):
                try: active_dates.add(date.fromisoformat(val))
                except: pass
            elif isinstance(val, datetime): active_dates.add(val.date())
            elif isinstance(val, date): active_dates.add(val)

        act_stmt = select(UserDailyActivity.activity_date).where(UserDailyActivity.user_id == user_id)
        act_res2 = await db.execute(act_stmt)
        for row in act_res2.all():
            if row[0]: active_dates.add(row[0])

        sorted_dates = sorted(list(active_dates), reverse=True)

        # 3. Calculate consecutive active streak
        streak = 0
        if sorted_dates:
            today_date = datetime.utcnow().date()
            yesterday_date = today_date - timedelta(days=1)
            if sorted_dates[0] == today_date or sorted_dates[0] == yesterday_date:
                streak = 1
                current_date = sorted_dates[0]
                for d in sorted_dates[1:]:
                    if (current_date - d).days == 1:
                        streak += 1
                        current_date = d
                    elif (current_date - d).days == 0:
                        continue
                    else:
                        break

        # 4. Check DeckGoal streak max
        goal_res = await db.execute(select(func.max(DeckGoal.streak_count)).where(DeckGoal.user_id == user_id))
        max_goal_streak = goal_res.scalar() or 0

        final_streak = max(streak, max_goal_streak)

        # Update UserGamification
        res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = res.scalar_one_or_none()
        if user_stats:
            if user_stats.streak_count != final_streak:
                user_stats.streak_count = final_streak
            user_stats.last_activity = datetime.utcnow()
        else:
            user_stats = UserGamification(user_id=user_id, streak_count=final_streak, last_activity=datetime.utcnow())
            db.add(user_stats)
        
        try:
            await db.commit()
        except Exception:
            await db.rollback()

        return final_streak

    @staticmethod
    async def update_streak(db: AsyncSession, user_id: int, local_date_str: Optional[str] = None):
        return await GamificationInterface.sync_and_get_streak(db, user_id)

    @staticmethod
    async def get_user_stats(db: AsyncSession, user_id: int):
        streak_val = await GamificationInterface.sync_and_get_streak(db, user_id)
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

