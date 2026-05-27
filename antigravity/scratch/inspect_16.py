import asyncio
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.quiz.models import Question, UserQuestionMastery
from sqlalchemy.future import select
from fsrs import Card, Scheduler, Rating, State
from datetime import datetime, timezone

async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(UserQuestionMastery)
            .filter(UserQuestionMastery.question_id == 16)
        )
        m = result.scalars().first()
        if m:
            print("DB VALUES:")
            print(f"  state: {m.state}")
            print(f"  step: {m.step}")
            print(f"  stability: {m.stability}")
            print(f"  difficulty: {m.difficulty}")
            print(f"  due: {m.due}")
            print(f"  last_review: {m.last_review}")
            
            s = Scheduler()
            now = datetime.now(timezone.utc)
            
            state_map = {0: State.Learning, 1: State.Learning, 2: State.Review, 3: State.Relearning}
            c = Card()
            c.state = state_map.get(m.state, State.Learning)
            c.step = m.step
            c.stability = m.stability
            c.difficulty = m.difficulty
            c.due = m.due.replace(tzinfo=timezone.utc) if m.due else now
            c.last_review = m.last_review.replace(tzinfo=timezone.utc) if m.last_review else None
            
            cg, _ = s.review_card(c, Rating.Good, now)
            ce, _ = s.review_card(c, Rating.Easy, now)
            
            print("\nSIMULATED OUTPUT:")
            print("GOOD:")
            print(f"  State: {cg.state}")
            print(f"  Stability: {cg.stability}")
            print(f"  Difficulty: {cg.difficulty}")
            print(f"  Due: {cg.due}")
            print(f"  Due delta (days): {(cg.due - now).total_seconds() / 86400}")
            
            print("EASY:")
            print(f"  State: {ce.state}")
            print(f"  Stability: {ce.stability}")
            print(f"  Difficulty: {ce.difficulty}")
            print(f"  Due: {ce.due}")
            print(f"  Due delta (days): {(ce.due - now).total_seconds() / 86400}")
            
        else:
            print("No mastery found for question 16")

if __name__ == '__main__':
    asyncio.run(main())
