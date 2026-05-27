import asyncio
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.quiz.models import Question
from app.modules.quiz.models import UserQuestionMastery
from sqlalchemy.future import select
from fsrs import Card, Scheduler, Rating, State
from datetime import datetime, timezone

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(UserQuestionMastery))
        records = result.scalars().all()
        scheduler = Scheduler()
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        
        print(f"Total mastery records found: {len(records)}")
        match_count = 0
        for m in records:
            state_map = {0: State.Learning, 1: State.Learning, 2: State.Review, 3: State.Relearning}
            fsrs_card = Card()
            fsrs_card.state = state_map.get(m.state, State.Learning)
            fsrs_card.step = m.step
            fsrs_card.stability = m.stability
            fsrs_card.difficulty = m.difficulty
            fsrs_card.due = m.due.replace(tzinfo=timezone.utc) if m.due else now_utc
            fsrs_card.last_review = m.last_review.replace(tzinfo=timezone.utc) if m.last_review else None
            
            intervals = {}
            for r_val, r_enum in [(1, Rating.Again), (2, Rating.Hard), (3, Rating.Good), (4, Rating.Easy)]:
                try:
                    card_copy, _ = scheduler.review_card(fsrs_card, r_enum, now_utc)
                    delta = card_copy.due - now_utc
                    if delta.total_seconds() < 60:
                        int_str = "<1m"
                    elif delta.total_seconds() < 3600:
                        int_str = f"{int(delta.total_seconds() / 60)}m"
                    elif delta.total_seconds() < 86400:
                        int_str = f"{int(delta.total_seconds() / 3600)}h"
                    else:
                        int_str = f"{int(delta.total_seconds() / 86400)}d"
                    intervals[r_val] = int_str
                except Exception as e:
                    intervals[r_val] = f"error: {str(e)}"
            
            if intervals.get(3) == "1d" and intervals.get(4) == "1d":
                match_count += 1
                print(f"Match #{match_count}: Card ID={m.question_id} | State={m.state} Step={m.step} Stability={m.stability} Difficulty={m.difficulty}")
                print(f"  Intervals: {intervals}")
                # Print the raw delta in days for Good and Easy
                try:
                    c_good, _ = scheduler.review_card(fsrs_card, Rating.Good, now_utc)
                    c_easy, _ = scheduler.review_card(fsrs_card, Rating.Easy, now_utc)
                    d_good = (c_good.due - now_utc).total_seconds() / 86400
                    d_easy = (c_easy.due - now_utc).total_seconds() / 86400
                    print(f"  Raw Good Days: {d_good:.6f} | Raw Easy Days: {d_easy:.6f}")
                except:
                    pass

if __name__ == '__main__':
    asyncio.run(main())
