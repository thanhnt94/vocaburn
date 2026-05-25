import asyncio
import os
import sys
import json

# Add root directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure console to print UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.core.config import settings
from app.modules.auth.models import User
from app.modules.quiz.models import Question, Quiz, QuizRoom, QuizCollaborator, UserQuestionMastery, UserDeckSettings

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.modules.quiz.services.mcq_engine import MCQEngine

DATABASE_URL = settings.DATABASE_URL

async def test_mcq():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Search for SAT deck
        quiz_res = await db.execute(select(Quiz).where(Quiz.title.like("%SAT%")))
        quiz = quiz_res.scalar()
        if not quiz:
            print("SAT deck not found!")
            return
            
        deck_id = quiz.id
        print(f"Testing MCQ for Deck {deck_id}: {quiz.title}")
        
        q_res = await db.execute(select(Question).where(Question.quiz_id == deck_id))
        questions = q_res.scalars().all()
        print(f"Total questions in deck: {len(questions)}")
        
        all_items = []
        for q in questions:
            all_items.append({
                "id": q.id,
                "front": q.content,
                "back": q.explanation,
                "others": q.others
            })
            
        # Let's find "Ephemeral" question if it exists, or just use first question
        q = None
        for question in questions:
            if "Ephemeral" in (question.content or ""):
                q = question
                break
        if not q:
            q = questions[0]
            
        item_data = {
            "id": q.id,
            "front": q.content,
            "back": q.explanation,
            "others": q.others
        }
        
        config = {
            "q_col": "front",
            "a_col": "back",
            "num_choices": 4
        }
        
        result = MCQEngine.generate_question(item_data, all_items, config)
        print("Generated question:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(test_mcq())
