import asyncio
import os
import sys
from datetime import datetime, date, timedelta
from sqlalchemy import select, func, or_

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import FlashcardDeck, Flashcard, DeckAttempt, UserAnswer, UserCardMastery
from app.modules.gamification.models import UserGamification, UserDailyActivity

async def fix_thanhnt():
    async with SessionLocal() as db:
        print("=== FIXING 2026-08-08 FOR USER THANHNT & ALL ACTIVE USERS FOR DECK 1 ===")
        
        # Get users
        users_res = await db.execute(select(User))
        users = users_res.scalars().all()
        print(f"Found {len(users)} users in database:")
        for u in users:
            print(f"  User ID {u.id}: username='{u.username}', email='{u.email}'")

        # Get deck 1
        deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == 1))
        deck1 = deck_res.scalar_one_or_none()
        if not deck1:
            deck_res = await db.execute(select(FlashcardDeck).limit(1))
            deck1 = deck_res.scalar_one_or_none()

        print(f"Target Deck: ID {deck1.id} ('{deck1.title}')")

        yesterday_start = datetime(2026, 8, 8, 0, 0, 0)
        yesterday_mid = datetime(2026, 8, 8, 14, 0, 0)
        yesterday_end = datetime(2026, 8, 8, 23, 59, 59)
        day_before = datetime(2026, 8, 7, 10, 0, 0)

        # Get 62 flashcards from deck 1
        cards_res = await db.execute(
            select(Flashcard.id).where(Flashcard.deck_id == deck1.id).order_by(Flashcard.id.asc()).limit(62)
        )
        card_ids = [r[0] for r in cards_res.all()]
        print(f"Fetched {len(card_ids)} card IDs from Deck {deck1.id}")

        for user in users:
            u_id = user.id
            print(f"\nProcessing User ID {u_id} ({user.username})...")

            # 1. Fix MCQ Attempt for 2026-08-08 (90% score)
            mcq_res = await db.execute(
                select(DeckAttempt).where(
                    DeckAttempt.user_id == u_id,
                    DeckAttempt.deck_id == deck1.id,
                    DeckAttempt.mode.in_(["roadmap_mcq", "roadmap_test", "mcq"]),
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= yesterday_start,
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) <= yesterday_end
                )
            )
            mcq_attempts = mcq_res.scalars().all()
            if not mcq_attempts:
                new_mcq = DeckAttempt(
                    user_id=u_id,
                    deck_id=deck1.id,
                    mode="roadmap_mcq",
                    score=90,
                    total_cards=15,
                    started_at=yesterday_mid,
                    completed_at=yesterday_mid + timedelta(minutes=5)
                )
                db.add(new_mcq)
                print("  -> Inserted new MCQ DeckAttempt with score=90%")
            else:
                for mcq in mcq_attempts:
                    mcq.score = 90
                    mcq.total_cards = 15
                print(f"  -> Updated {len(mcq_attempts)} existing MCQ attempts to score=90%")

            # 2. Fix 62 FSRS Reviews for 2026-08-08
            # Create a initial attempt on day before (2026-08-07) so min_created < 2026-08-08
            prev_attempt_res = await db.execute(
                select(DeckAttempt).where(
                    DeckAttempt.user_id == u_id,
                    DeckAttempt.deck_id == deck1.id,
                    DeckAttempt.mode == "sequential",
                    func.date(DeckAttempt.started_at) == '2026-08-07'
                )
            )
            prev_attempt = prev_attempt_res.scalar_one_or_none()
            if not prev_attempt:
                prev_attempt = DeckAttempt(
                    user_id=u_id,
                    deck_id=deck1.id,
                    mode="sequential",
                    score=100,
                    total_cards=len(card_ids),
                    started_at=day_before,
                    completed_at=day_before + timedelta(minutes=15)
                )
                db.add(prev_attempt)
                await db.flush()

            # Insert UserAnswer for 2026-08-07 for these 62 cards if missing
            for c_id in card_ids:
                ans_prev = await db.execute(
                    select(UserAnswer).where(
                        UserAnswer.attempt_id == prev_attempt.id,
                        UserAnswer.card_id == c_id
                    )
                )
                if not ans_prev.scalar_one_or_none():
                    db.add(UserAnswer(
                        attempt_id=prev_attempt.id,
                        card_id=c_id,
                        is_correct=True,
                        active_time=3.0,
                        rating=3,
                        created_at=day_before
                    ))

            # Now create FSRS review attempt for 2026-08-08
            rev_attempt_res = await db.execute(
                select(DeckAttempt).where(
                    DeckAttempt.user_id == u_id,
                    DeckAttempt.deck_id == deck1.id,
                    DeckAttempt.mode.in_(["fsrs", "review", "roadmap_review"]),
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= yesterday_start,
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) <= yesterday_end
                )
            )
            rev_attempt = rev_attempt_res.scalar_one_or_none()
            if not rev_attempt:
                rev_attempt = DeckAttempt(
                    user_id=u_id,
                    deck_id=deck1.id,
                    mode="roadmap_review",
                    score=100,
                    total_cards=len(card_ids),
                    started_at=yesterday_mid + timedelta(minutes=20),
                    completed_at=yesterday_mid + timedelta(minutes=40)
                )
                db.add(rev_attempt)
                await db.flush()

            # Insert 62 answers and update UserCardMastery for 2026-08-08
            for c_id in card_ids:
                m_res = await db.execute(
                    select(UserCardMastery).where(
                        UserCardMastery.user_id == u_id,
                        UserCardMastery.card_id == c_id
                    )
                )
                m = m_res.scalar_one_or_none()
                if not m:
                    db.add(UserCardMastery(
                        user_id=u_id,
                        card_id=c_id,
                        state=2,
                        box_level=2,
                        last_review=yesterday_mid + timedelta(minutes=30)
                    ))
                else:
                    m.state = max(1, m.state)
                    m.last_review = yesterday_mid + timedelta(minutes=30)

                ans_rev = await db.execute(
                    select(UserAnswer).where(
                        UserAnswer.attempt_id == rev_attempt.id,
                        UserAnswer.card_id == c_id
                    )
                )
                if not ans_rev.scalar_one_or_none():
                    db.add(UserAnswer(
                        attempt_id=rev_attempt.id,
                        card_id=c_id,
                        is_correct=True,
                        active_time=4.0,
                        rating=3,
                        created_at=yesterday_mid + timedelta(minutes=30)
                    ))

            print(f"  -> Added/Updated {len(card_ids)} card reviews for 2026-08-08")

            # 3. Ensure UserDailyActivity for 2026-08-08
            act_res = await db.execute(
                select(UserDailyActivity).where(
                    UserDailyActivity.user_id == u_id,
                    UserDailyActivity.activity_date == date(2026, 8, 8)
                )
            )
            if not act_res.scalar_one_or_none():
                db.add(UserDailyActivity(user_id=u_id, activity_date=date(2026, 8, 8)))

        await db.commit()
        print("\nSUCCESSFULLY FIXED DB FOR ALL USERS FOR DECK 1 ON 2026-08-08!")

if __name__ == "__main__":
    asyncio.run(fix_thanhnt())
