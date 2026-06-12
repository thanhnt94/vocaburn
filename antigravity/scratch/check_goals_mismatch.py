import asyncio
import os
import sys

# Add app to path
sys.path.append(os.path.abspath("."))

from sqlalchemy import select, func, or_
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserDeckGoal, UserDailyProgress, Flashcard, UserCardMastery, UserAnswer, DeckAttempt
from datetime import datetime

async def main():
    async with SessionLocal() as db:
        # Check all users
        users_res = await db.execute(select(func.distinct(UserDeckGoal.user_id)))
        user_ids = [r[0] for r in users_res.all()]
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime("%Y-%m-%d")
        
        print(f"Checking consistency for date: {today_str}\n")
        
        for user_id in user_ids:
            # 1. Sum of done_today for all active goals
            res_goals = await db.execute(
                select(UserDeckGoal, UserDailyProgress.count_done)
                .outerjoin(UserDailyProgress, (UserDailyProgress.goal_id == UserDeckGoal.id) & (UserDailyProgress.date == today_str))
                .filter(UserDeckGoal.user_id == user_id, UserDeckGoal.status == "active")
            )
            goals_list = res_goals.all()
            sum_done_today = sum((g[1] or 0) for g in goals_list)
            
            # 2. Global count from UserAnswer query
            stmt_new_cards = select(func.count(func.distinct(UserAnswer.card_id))).join(
                DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
            ).where(
                DeckAttempt.user_id == user_id,
                DeckAttempt.mode == "play",
                UserAnswer.created_at >= today,
                ~UserAnswer.card_id.in_(
                    select(UserAnswer.card_id).join(
                        DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
                    ).where(
                        DeckAttempt.user_id == user_id,
                        DeckAttempt.mode == "play",
                        UserAnswer.created_at < today
                    )
                )
            )
            res_new_cards = await db.execute(stmt_new_cards)
            global_done_today = res_new_cards.scalar() or 0
            
            print(f"User ID: {user_id}")
            print(f"  Sum of active deck goals done_today: {sum_done_today}")
            print(f"  Global new cards completed today:   {global_done_today}")
            
            if sum_done_today != global_done_today:
                print("  [!] MISMATCH DETECTED!")
                # Let's inspect the cards
                # Find all answers today in play mode
                answers_res = await db.execute(
                    select(UserAnswer.card_id, UserAnswer.created_at, Flashcard.deck_id)
                    .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                    .join(Flashcard, UserAnswer.card_id == Flashcard.id)
                    .where(
                        DeckAttempt.user_id == user_id,
                        DeckAttempt.mode == "play",
                        UserAnswer.created_at >= today
                    )
                )
                today_answers = answers_res.all()
                print("  Today's answers in play mode:")
                for ans in today_answers:
                    # Check if it had prior answers
                    prior_res = await db.execute(
                        select(func.count(UserAnswer.id))
                        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                        .where(
                            DeckAttempt.user_id == user_id,
                            DeckAttempt.mode == "play",
                            UserAnswer.card_id == ans.card_id,
                            UserAnswer.created_at < today
                        )
                    )
                    has_prior = prior_res.scalar() > 0
                    
                    # Check mastery
                    mastery_res = await db.execute(
                        select(UserCardMastery).where(
                            UserCardMastery.user_id == user_id,
                            UserCardMastery.card_id == ans.card_id
                        )
                    )
                    mastery = mastery_res.scalar_one_or_none()
                    last_review = mastery.last_review if mastery else None
                    
                    print(f"    Card ID {ans.card_id} (Deck {ans.deck_id}):")
                    print(f"      Has prior UserAnswer before today: {has_prior}")
                    print(f"      Mastery last_review: {last_review}")
            else:
                print("  [OK] Consistent.")
            print()

if __name__ == '__main__':
    asyncio.run(main())
