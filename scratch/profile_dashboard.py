import asyncio
import time
import os
import sys
# Add current directory to path
sys.path.append(os.path.abspath("."))
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from app.core.db import AsyncSession, engine
from app.modules.deck.models import FlashcardDeck, DeckAttempt, Flashcard
from app.modules.gamification.interface import GamificationInterface
from app.modules.stats.interface import StatsInterface
from app.modules.notification.interface import NotificationInterface

async def profile():
    user_id_int = 1 # profile for user 1
    
    async with AsyncSession(engine) as db:
        print("[+] Starting profiling...")
        
        start = time.time()
        # Query A: My & Archived Decks
        subq = select(
            DeckAttempt.deck_id,
            func.max(case((DeckAttempt.is_archived == True, 1), else_=0)).label("is_archived")
        ).where(
            DeckAttempt.user_id == user_id_int
        ).group_by(
            DeckAttempt.deck_id
        ).subquery()

        query_a = select(
            FlashcardDeck,
            select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count"),
            subq.c.is_archived
        ).join(
            subq, FlashcardDeck.id == subq.c.deck_id
        ).options(
            selectinload(FlashcardDeck.tags)
        )
        
        t0 = time.time()
        res_a = await db.execute(query_a)
        res_a_all = res_a.all()
        print(f"[*] Query A: {len(res_a_all)} rows, took {time.time() - t0:.4f}s")
        
        # Query B: Created Decks
        query_b = select(
            FlashcardDeck,
            select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
        ).options(
            selectinload(FlashcardDeck.tags)
        ).where(FlashcardDeck.creator_id == user_id_int)
        
        t0 = time.time()
        res_b = await db.execute(query_b)
        res_b_all = res_b.all()
        print(f"[*] Query B: {len(res_b_all)} rows, took {time.time() - t0:.4f}s")
        
        # Query C: Discover Decks
        attempted_sub = select(DeckAttempt.deck_id).where(DeckAttempt.user_id == user_id_int)
        created_sub = select(FlashcardDeck.id).where(FlashcardDeck.creator_id == user_id_int)
        
        query_c = select(
            FlashcardDeck,
            select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
        ).options(
            selectinload(FlashcardDeck.tags)
        ).where(
            FlashcardDeck.id.not_in(attempted_sub),
            FlashcardDeck.id.not_in(created_sub)
        ).order_by(
            FlashcardDeck.created_at.desc()
        ).limit(12)
        
        t0 = time.time()
        res_c = await db.execute(query_c)
        res_c_all = res_c.all()
        print(f"[*] Query C: {len(res_c_all)} rows, took {time.time() - t0:.4f}s")
        
        # Gamify Stats
        t0 = time.time()
        gamify_data = await GamificationInterface.get_user_stats(db, user_id_int)
        print(f"[*] Gamify Stats: took {time.time() - t0:.4f}s")
        
        # User Summary
        t0 = time.time()
        stats_summary = await StatsInterface.get_user_summary(db, user_id_int)
        print(f"[*] User Summary: took {time.time() - t0:.4f}s")
        
        # Notifications
        t0 = time.time()
        notifications = await NotificationInterface.get_latest(db, user_id_int)
        print(f"[*] Notifications: took {time.time() - t0:.4f}s")
        
        # Unread count
        t0 = time.time()
        unread_count = await NotificationInterface.get_unread_count(db, user_id_int)
        print(f"[*] Unread count: took {time.time() - t0:.4f}s")
        
        print(f"[+] Total time: {time.time() - start:.4f}s")

if __name__ == "__main__":
    asyncio.run(profile())
