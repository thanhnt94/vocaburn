import asyncio
import os
import sys

# Add app to path
sys.path.append(os.path.abspath("."))

from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserDeckSettings, FlashcardDeck

async def main():
    import sys
    import io
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    async with SessionLocal() as db:
        res = await db.execute(select(UserDeckSettings))
        settings_rows = res.scalars().all()
        print(f"Total UserDeckSettings rows: {len(settings_rows)}")
        for row in settings_rows:
            print(f"User ID: {row.user_id}, Deck ID: {row.deck_id}, Settings: {row.settings}")
            
        from app.modules.deck.models import Flashcard
        res_decks = await db.execute(select(FlashcardDeck))
        decks = res_decks.scalars().all()
        for deck in decks:
            print(f"Deck ID: {deck.id}, Title: {deck.title}, Practice Settings: {deck.practice_settings}")
            
        res_cards = await db.execute(select(Flashcard).where(Flashcard.deck_id == 1).limit(3))
        cards = res_cards.scalars().all()
        print("\nSample Flashcards:")
        for card in cards:
            print(f"  Card ID: {card.id}")
            print(f"    Content: {card.content}")
            print(f"    Explanation: {card.explanation}")
            print(f"    Others: {card.others}")

if __name__ == '__main__':
    asyncio.run(main())
