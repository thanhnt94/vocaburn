import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.deck.models import UserDailyProgress, UserDeckGoal, FlashcardDeck, UserAnswer, DeckAttempt, Flashcard, UserDeckSettings

async def fix_progress():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("=== Recalculating UserDailyProgress for Aug 12, 2026 ===")
        
        # Query all UserDailyProgress for Aug 12
        res = await db.execute(
            select(UserDailyProgress, UserDeckGoal)
            .join(UserDeckGoal, UserDailyProgress.goal_id == UserDeckGoal.id)
            .where(UserDailyProgress.date == "2026-08-12")
        )
        records = res.all()
        
        for prog, goal in records:
            # Query actual user answers on 2026-08-12 for this deck
            answers_count = await db.scalar(
                select(func.count(UserAnswer.id))
                .join(Flashcard, UserAnswer.card_id == Flashcard.id)
                .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                .where(
                    Flashcard.deck_id == goal.deck_id,
                    DeckAttempt.user_id == goal.user_id,
                    UserAnswer.created_at >= "2026-08-12 00:00:00",
                    UserAnswer.created_at < "2026-08-13 00:00:00"
                )
            ) or 0
            
            # Query new cards learned on Aug 12
            min_answer_sub = select(
                UserAnswer.card_id,
                func.min(UserAnswer.created_at).label("min_created")
            ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
             .where(
                 DeckAttempt.user_id == goal.user_id,
                 DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
             )\
             .group_by(UserAnswer.card_id).subquery()
            
            new_learned = await db.scalar(
                select(func.count(min_answer_sub.c.card_id))
                .join(Flashcard, min_answer_sub.c.card_id == Flashcard.id)
                .where(
                    Flashcard.deck_id == goal.deck_id,
                    min_answer_sub.c.min_created >= "2026-08-12 00:00:00",
                    min_answer_sub.c.min_created < "2026-08-13 00:00:00"
                )
            ) or 0
            
            # Get user deck target settings
            sett_res = await db.scalar(
                select(UserDeckSettings.settings)
                .where(UserDeckSettings.user_id == goal.user_id, UserDeckSettings.deck_id == goal.deck_id)
            )
            target = 10
            if sett_res and isinstance(sett_res, dict):
                pipeline = sett_res.get("pipeline", [])
                for st in pipeline:
                    if st.get("type") == "new_cards":
                        target = int(st.get("daily_count", 10))
                        break
            
            should_be_met = (new_learned >= target) and (answers_count > 0)
            
            if prog.is_target_met != should_be_met:
                print(f"[FIX] Goal ID {goal.id} (User {goal.user_id}, Deck {goal.deck_id}): Changing is_target_met from {prog.is_target_met} to {should_be_met} (new_learned: {new_learned}/{target}, answers: {answers_count})")
                prog.is_target_met = should_be_met
                
        await db.commit()
        print("=== Fix completed successfully ===")

if __name__ == "__main__":
    asyncio.run(fix_progress())
