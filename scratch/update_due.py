import asyncio
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy import select, update
from app.core.db import SessionLocal
from app.modules.deck.models import FlashcardDeck, Flashcard, UserCardMastery
from app.modules.auth.models import User

async def main():
    async with SessionLocal() as db:
        user_id = 1
        
        cards = await db.execute(
            select(UserCardMastery.id, UserCardMastery.due)
            .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
            .where(
                Flashcard.deck_id == 1,
                UserCardMastery.user_id == user_id,
                UserCardMastery.state > 0,
                UserCardMastery.due <= '2026-08-08 00:00:00'
            )
        )
        card_ids = [row[0] for row in cards.all()]
        print(f"Found {len(card_ids)} cards due for August 8th cutoff.")
        
        if card_ids:
            from datetime import datetime
            new_due = datetime.strptime('2026-08-08 00:00:01', '%Y-%m-%d %H:%M:%S')
            await db.execute(
                update(UserCardMastery)
                .where(UserCardMastery.id.in_(card_ids))
                .values(due=new_due)
            )
            await db.commit()
            print("Successfully updated due dates to push them to August 9th.")

asyncio.run(main())
