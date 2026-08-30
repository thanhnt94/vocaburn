import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.deck.models import UserDailyProgress, UserDeckGoal, FlashcardDeck, UserAnswer, DeckAttempt, Flashcard

async def inspect():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("=== UserDailyProgress for 2026-08-12 & 2026-08-13 ===")
        res = await db.execute(
            select(UserDailyProgress, UserDeckGoal, FlashcardDeck)
            .join(UserDeckGoal, UserDailyProgress.goal_id == UserDeckGoal.id)
            .join(FlashcardDeck, UserDeckGoal.deck_id == FlashcardDeck.id)
            .where(UserDailyProgress.date.in_(["2026-08-12", "2026-08-13"]))
        )
        records = res.all()
        for prog, goal, deck in records:
            print(f"User ID: {goal.user_id} | Date: {prog.date} | Deck: {deck.title} (ID: {deck.id}) | is_target_met: {prog.is_target_met} | count_done: {prog.count_done}")

        print("\n=== User Answers on 2026-08-12 ===")
        answers_res = await db.execute(
            select(func.count(UserAnswer.id), Flashcard.deck_id)
            .join(Flashcard, UserAnswer.card_id == Flashcard.id)
            .where(UserAnswer.created_at >= "2026-08-12 00:00:00", UserAnswer.created_at < "2026-08-13 00:00:00")
            .group_by(Flashcard.deck_id)
        )
        for count, deck_id in answers_res.all():
            print(f"Deck ID {deck_id}: {count} answers on 2026-08-12")

if __name__ == "__main__":
    asyncio.run(inspect())
