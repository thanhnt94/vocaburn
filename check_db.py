import asyncio
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.quiz.models import Question
from app.modules.quiz.models import UserQuestionMastery
from sqlalchemy.future import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(UserQuestionMastery)
            .filter(UserQuestionMastery.question_id == 2998)
        )
        mastery = result.scalars().first()
        if mastery:
            print(f"Question ID: {mastery.question_id}")
            print(f"Due in DB: {mastery.due} (type: {type(mastery.due)})")
            print(f"State: {mastery.state}")
            print(f"Stability: {mastery.stability}")
            print(f"Difficulty: {mastery.difficulty}")
        else:
            print("No mastery found for question 2998")

if __name__ == '__main__':
    asyncio.run(main())
