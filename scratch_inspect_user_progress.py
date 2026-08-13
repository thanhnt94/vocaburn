import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.deck.models import UserDailyProgress, UserDeckGoal

async def inspect():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(UserDailyProgress, UserDeckGoal)
            .join(UserDeckGoal, UserDailyProgress.goal_id == UserDeckGoal.id)
        )
        for p, g in res.all():
            print(f"Date: {p.date} | User: {g.user_id} | Deck: {g.deck_id} | Goal ID: {g.id} | Met: {p.is_target_met} | Rescued: {p.is_rescued}")

if __name__ == "__main__":
    asyncio.run(inspect())
