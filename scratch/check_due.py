import asyncio
from sqlalchemy import select, func, create_engine, text
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserCardMastery, Flashcard, FlashcardDeck
from datetime import datetime

async def main():
    async with SessionLocal() as db:
        # Query CentralAuth.db
        engine = create_engine("sqlite:///../Storage/database/CentralAuth.db")
        with engine.connect() as conn:
            res = conn.execute(text("SELECT id, username, email FROM users"))
            print("CentralAuth users:")
            for row in res.all():
                print(f"  User ID {row[0]}: username={row[1]}, email={row[2]}")
                
        # Query Vocaburn.db users
        vocab_engine = create_engine("sqlite:///../Storage/database/Vocaburn.db")
        with vocab_engine.connect() as conn:
            res = conn.execute(text("SELECT DISTINCT user_id FROM deck_attempts"))
            print("User IDs in Vocaburn.db deck_attempts:")
            for row in res.all():
                print(f"  User ID {row[0]}")
                
            res = conn.execute(text("SELECT DISTINCT user_id FROM user_card_mastery"))
            print("User IDs in Vocaburn.db user_card_mastery:")
            for row in res.all():
                print(f"  User ID {row[0]}")
                
            # Count mastery records per user
            res = conn.execute(text("SELECT user_id, COUNT(*) FROM user_card_mastery GROUP BY user_id"))
            print("Mastery count per user:")
            for row in res.all():
                print(f"  User ID {row[0]}: {row[1]} records")

if __name__ == "__main__":
    asyncio.run(main())
