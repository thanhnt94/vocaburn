import asyncio
import os
import sys

# Ensure root directory in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.db import SessionLocal
from app.modules.gamification.models import UserGamification, UserDailyActivity
from app.modules.deck.models import UserAnswer, DeckAttempt
from app.modules.auth.models import User
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta

async def run_backfill():
    async with SessionLocal() as db:
        print("Starting UserDailyActivity backfill and UserGamification streak recalculation...")
        
        # 1. Fetch all users
        users_res = await db.execute(select(User.id))
        user_ids = [r[0] for r in users_res.all()]
        print(f"Found {len(user_ids)} users.")

        for u_id in user_ids:
            # Fetch all distinct activity dates from UserAnswer and DeckAttempt for this user
            answer_dates = set()
            ans_stmt = (
                select(func.date(UserAnswer.created_at))
                .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                .where(DeckAttempt.user_id == u_id)
                .group_by(func.date(UserAnswer.created_at))
            )
            ans_res = await db.execute(ans_stmt)
            for row in ans_res.all():
                val = row[0]
                if isinstance(val, str):
                    try: answer_dates.add(date.fromisoformat(val))
                    except: pass
                elif isinstance(val, datetime): answer_dates.add(val.date())
                elif isinstance(val, date): answer_dates.add(val)

            att_stmt = (
                select(func.date(DeckAttempt.started_at))
                .where(DeckAttempt.user_id == u_id)
                .group_by(func.date(DeckAttempt.started_at))
            )
            att_res = await db.execute(att_stmt)
            for row in att_res.all():
                val = row[0]
                if isinstance(val, str):
                    try: answer_dates.add(date.fromisoformat(val))
                    except: pass
                elif isinstance(val, datetime): answer_dates.add(val.date())
                elif isinstance(val, date): answer_dates.add(val)

            # Insert missing UserDailyActivity records
            for act_date in answer_dates:
                exist_res = await db.execute(
                    select(UserDailyActivity).where(
                        and_(
                            UserDailyActivity.user_id == u_id,
                            UserDailyActivity.activity_date == act_date
                        )
                    )
                )
                if not exist_res.scalar_one_or_none():
                    db.add(UserDailyActivity(user_id=u_id, activity_date=act_date))

            await db.flush()

            # Calculate consecutive active streak
            act_stmt = select(UserDailyActivity.activity_date).where(UserDailyActivity.user_id == u_id)
            act_res = await db.execute(act_stmt)
            all_dates = set(row[0] for row in act_res.all() if row[0])
            sorted_dates = sorted(list(all_dates), reverse=True)

            print(f"User {u_id} sorted_dates = {sorted_dates}")

            streak = 0
            if sorted_dates:
                today_date = datetime.utcnow().date()
                yesterday_date = today_date - timedelta(days=1)
                if sorted_dates[0] == today_date or sorted_dates[0] == yesterday_date:
                    streak = 1
                    curr_date = sorted_dates[0]
                    for d in sorted_dates[1:]:
                        diff = (curr_date - d).days
                        if diff == 1:
                            streak += 1
                            curr_date = d
                        elif diff == 0:
                            continue
                        else:
                            break

            # Update UserGamification
            g_res = await db.execute(select(UserGamification).where(UserGamification.user_id == u_id))
            user_g = g_res.scalar_one_or_none()
            if not user_g:
                user_g = UserGamification(user_id=u_id, streak_count=streak)
                db.add(user_g)
            else:
                user_g.streak_count = streak

            print(f"User {u_id}: total active dates = {len(all_dates)}, streak_count set to = {streak}")

        await db.commit()
        print("Backfill and recalculation finished successfully!")

if __name__ == '__main__':
    asyncio.run(run_backfill())
