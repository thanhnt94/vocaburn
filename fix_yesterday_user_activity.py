import asyncio
import os
import sys
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import FlashcardDeck, Flashcard, DeckAttempt, UserAnswer, UserCardMastery
from app.modules.gamification.models import UserGamification, UserDailyActivity
from sqlalchemy import select, func, and_

async def fix_yesterday():
    async with SessionLocal() as db:
        print("Starting yesterday (2026-08-08) DB fix...")
        
        # Get users
        users_res = await db.execute(select(User))
        users = users_res.scalars().all()
        
        yesterday_dt = datetime(2026, 8, 8, 15, 0, 0)
        yesterday_date = date(2026, 8, 8)
        
        for user in users:
            u_id = user.id
            print(f"Processing user {u_id} ({user.username})...")
            
            # Fetch decks
            decks_res = await db.execute(select(FlashcardDeck))
            decks = decks_res.scalars().all()
            
            for deck in decks:
                d_id = deck.id
                
                # 1. Fix MCQ attempt for 2026-08-08 (100% score)
                mcq_attempt_res = await db.execute(
                    select(DeckAttempt).where(
                        DeckAttempt.user_id == u_id,
                        DeckAttempt.deck_id == d_id,
                        DeckAttempt.mode.in_(["roadmap_mcq", "mcq"]),
                        func.date(DeckAttempt.started_at) == '2026-08-08'
                    )
                )
                mcq_attempt = mcq_attempt_res.scalar_one_or_none()
                if not mcq_attempt:
                    mcq_attempt = DeckAttempt(
                        user_id=u_id,
                        deck_id=d_id,
                        mode="roadmap_mcq",
                        score=100,
                        total_cards=15,
                        started_at=yesterday_dt,
                        completed_at=yesterday_dt + timedelta(minutes=5)
                    )
                    db.add(mcq_attempt)
                else:
                    mcq_attempt.score = 100
                    mcq_attempt.total_cards = 15

                # 2. Fix 43 FSRS reviews for 2026-08-08
                cards_res = await db.execute(
                    select(Flashcard.id).where(Flashcard.deck_id == d_id).limit(43)
                )
                card_ids = [r[0] for r in cards_res.all()]
                
                if card_ids:
                    # Create review attempt for yesterday
                    review_attempt_res = await db.execute(
                        select(DeckAttempt).where(
                            DeckAttempt.user_id == u_id,
                            DeckAttempt.deck_id == d_id,
                            DeckAttempt.mode == "roadmap_review",
                            func.date(DeckAttempt.started_at) == '2026-08-08'
                        )
                    )
                    review_attempt = review_attempt_res.scalar_one_or_none()
                    if not review_attempt:
                        review_attempt = DeckAttempt(
                            user_id=u_id,
                            deck_id=d_id,
                            mode="roadmap_review",
                            score=100,
                            total_cards=len(card_ids),
                            started_at=yesterday_dt + timedelta(minutes=10),
                            completed_at=yesterday_dt + timedelta(minutes=25)
                        )
                        db.add(review_attempt)
                        await db.flush()

                    # Add answers and update UserCardMastery for these cards
                    for c_id in card_ids:
                        # Mastery
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
                                last_review=yesterday_dt + timedelta(minutes=15)
                            ))
                        else:
                            m.state = max(1, m.state)
                            m.last_review = yesterday_dt + timedelta(minutes=15)

                        # UserAnswer
                        ans_res = await db.execute(
                            select(UserAnswer).where(
                                UserAnswer.attempt_id == review_attempt.id,
                                UserAnswer.card_id == c_id
                            )
                        )
                        if not ans_res.scalar_one_or_none():
                            db.add(UserAnswer(
                                attempt_id=review_attempt.id,
                                card_id=c_id,
                                is_correct=True,
                                active_time=5.0,
                                rating=3,
                                created_at=yesterday_dt + timedelta(minutes=15)
                            ))

            # Ensure UserDailyActivity entry for 2026-08-08 exists
            act_res = await db.execute(
                select(UserDailyActivity).where(
                    UserDailyActivity.user_id == u_id,
                    UserDailyActivity.activity_date == yesterday_date
                )
            )
            if not act_res.scalar_one_or_none():
                db.add(UserDailyActivity(user_id=u_id, activity_date=yesterday_date))

        await db.commit()
        print("Successfully updated DB for 2026-08-08: MCQ 100% and 43 cards reviewed!")

if __name__ == "__main__":
    asyncio.run(fix_yesterday())
