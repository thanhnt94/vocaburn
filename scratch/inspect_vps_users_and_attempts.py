import asyncio
import os
import sys
from datetime import datetime
from sqlalchemy import select, func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import FlashcardDeck, DeckAttempt, UserAnswer, UserCardMastery

async def check():
    async with SessionLocal() as db:
        print("=== ALL USERS ===")
        u_res = await db.execute(select(User))
        for u in u_res.scalars().all():
            print(f"User ID: {u.id}, Username: '{u.username}', Email: '{u.email}', Role: '{u.role}'")

        print("\n=== ALL DECKS ===")
        d_res = await db.execute(select(FlashcardDeck))
        for d in d_res.scalars().all():
            print(f"Deck ID: {d.id}, Title: '{d.title}', CreatorID: {d.creator_id}")

        print("\n=== ATTEMPTS FOR 2026-08-08 ===")
        att_res = await db.execute(
            select(DeckAttempt).where(
                func.date(DeckAttempt.started_at) == '2026-08-08'
            )
        )
        for a in att_res.scalars().all():
            print(f"Attempt ID: {a.id}, UserID: {a.user_id}, DeckID: {a.deck_id}, Mode: '{a.mode}', Score: {a.score}, StartedAt: {a.started_at}")

        print("\n=== USER ANSWERS FOR 2026-08-08 ===")
        ans_res = await db.execute(
            select(UserAnswer.attempt_id, func.count(UserAnswer.id))
            .where(func.date(UserAnswer.created_at) == '2026-08-08')
            .group_by(UserAnswer.attempt_id)
        )
        for row in ans_res.all():
            print(f"Attempt ID: {row[0]}, Count: {row[1]}")

if __name__ == '__main__':
    asyncio.run(check())
