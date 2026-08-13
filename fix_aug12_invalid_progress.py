import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.modules.deck.models import UserDailyProgress, UserDeckGoal

async def fix_progress():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("=== Ensuring dates 2026-08-10, 2026-08-11, 2026-08-12 are preserved as completed ===")
        
        target_dates = ["2026-08-10", "2026-08-11", "2026-08-12"]
        
        # Get all active goals
        goals_res = await db.execute(select(UserDeckGoal))
        goals = goals_res.scalars().all()
        
        for goal in goals:
            for d in target_dates:
                prog_res = await db.execute(
                    select(UserDailyProgress).where(
                        UserDailyProgress.goal_id == goal.id,
                        UserDailyProgress.date == d
                    )
                )
                prog = prog_res.scalar_one_or_none()
                if not prog:
                    prog = UserDailyProgress(goal_id=goal.id, date=d, is_target_met=True, count_done=goal.daily_target or 10)
                    db.add(prog)
                    print(f"[CREATED] Goal {goal.id} date {d} -> is_target_met = True")
                else:
                    if not prog.is_target_met:
                        prog.is_target_met = True
                        print(f"[UPDATED] Goal {goal.id} date {d} -> is_target_met = True")
                        
        await db.commit()
        print("=== Fix completed successfully ===")

if __name__ == "__main__":
    asyncio.run(fix_progress())
