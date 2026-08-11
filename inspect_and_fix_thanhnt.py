import asyncio
import os
import sys
from datetime import date, datetime

# Ensure project imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select, and_
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserDeckGoal, UserDailyProgress, FlashcardDeck
from app.modules.stats.models import UserDailyStats, UserDailyActivity
from app.modules.gamification.interface import GamificationInterface

async def main():
    async with SessionLocal() as db:
        print("=== FIXING AUG 10 FOR USER thanhnt ===")
        res = await db.execute(select(User).where(User.username == 'thanhnt'))
        user = res.scalar_one_or_none()
        if not user:
            print("[-] User thanhnt not found!")
            return

        print(f"[+] Found User thanhnt (id={user.id}, sso_id={user.sso_id})")

        # 1. Update/Create UserDailyProgress for Aug 10, 2026 for all goals of user
        target_date_str = "2026-08-10"
        target_date_obj = date(2026, 8, 10)

        goals_res = await db.execute(select(UserDeckGoal).where(UserDeckGoal.user_id == user.id))
        goals = goals_res.scalars().all()

        for goal in goals:
            prog_res = await db.execute(
                select(UserDailyProgress).where(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == target_date_str
                )
            )
            prog = prog_res.scalar_one_or_none()
            if not prog:
                prog = UserDailyProgress(goal_id=goal.id, date=target_date_str, is_target_met=True)
                db.add(prog)
                print(f"[+] Created UserDailyProgress for goal_id={goal.id} on {target_date_str} (is_target_met=True)")
            else:
                prog.is_target_met = True
                print(f"[+] Updated UserDailyProgress for goal_id={goal.id} on {target_date_str} (is_target_met=True)")

        # 2. Update/Create UserDailyStats for Aug 10, 2026
        stats_res = await db.execute(
            select(UserDailyStats).where(
                UserDailyStats.user_id == user.id,
                UserDailyStats.date == target_date_str
            )
        )
        daily_stat = stats_res.scalar_one_or_none()
        if not daily_stat:
            daily_stat = UserDailyStats(
                user_id=user.id,
                date=target_date_str,
                reviewed_cards=107,
                is_active=True
            )
            db.add(daily_stat)
            print(f"[+] Created UserDailyStats for {target_date_str} with 107 reviewed cards")
        else:
            daily_stat.reviewed_cards = max(daily_stat.reviewed_cards or 0, 107)
            daily_stat.is_active = True
            print(f"[+] Updated UserDailyStats for {target_date_str} with {daily_stat.reviewed_cards} reviewed cards")

        # 3. Update/Create UserDailyActivity for Aug 10, 2026
        act_res = await db.execute(
            select(UserDailyActivity).where(
                UserDailyActivity.user_id == user.id,
                UserDailyActivity.activity_date == target_date_obj
            )
        )
        act = act_res.scalar_one_or_none()
        if not act:
            act = UserDailyActivity(user_id=user.id, activity_date=target_date_obj)
            db.add(act)
            print(f"[+] Created UserDailyActivity for {target_date_obj}")

        await db.commit()

        # 4. Recalculate streak
        streak = await GamificationInterface.update_streak(db, user.id)
        print(f"[+] Recalculated Global Streak for user thanhnt: {streak} days!")

if __name__ == '__main__':
    asyncio.run(main())
