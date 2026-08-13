import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.modules.deck.models import UserDailyProgress, UserDeckGoal

async def inspect():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        res = await db.execute(
            select(UserDailyProgress, UserDeckGoal)
            .join(UserDeckGoal, UserDailyProgress.goal_id == UserDeckGoal.id)
        )
        for p, g in res.all():
            print(f"Date: {p.date} | User: {g.user_id} | Deck: {g.deck_id} | Goal ID: {g.id} | Met: {p.is_target_met} | Rescued: {p.is_rescued}")

if __name__ == "__main__":
    asyncio.run(inspect())
