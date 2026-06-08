import asyncio
from sqlalchemy import select, func, create_engine, text
from app.core.db import SessionLocal

async def main():
    async with SessionLocal() as db:
        # 1. Print all UserDeckGoal
        res = await db.execute(text("SELECT id, user_id, deck_id, daily_target, streak_count, last_completed_date, status FROM user_deck_goals"))
        print("UserDeckGoal records:")
        for row in res.all():
            print(f"  Goal ID {row[0]}: user={row[1]}, deck={row[2]}, target={row[3]}, streak={row[4]}, last_completed={row[5]}, status={row[6]}")
            
        # 2. Print all UserDailyProgress
        res = await db.execute(text("SELECT id, goal_id, date, count_done, is_target_met FROM user_daily_progress"))
        print("UserDailyProgress records:")
        for row in res.all():
            print(f"  Progress ID {row[0]}: goal_id={row[1]}, date={row[2]}, count={row[3]}, met={row[4]}")
            
        # 3. Print all UserDailyStats
        res = await db.execute(text("SELECT id, user_id, date, questions_attempted, correct_answers, total_time_seconds, accuracy FROM user_daily_stats"))
        print("UserDailyStats records:")
        for row in res.all():
            print(f"  Stats ID {row[0]}: user={row[1]}, date={row[2]}, attempted={row[3]}, correct={row[4]}, time={row[5]}, acc={row[6]}")

if __name__ == "__main__":
    asyncio.run(main())
