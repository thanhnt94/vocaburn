import asyncio
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Import all models to populate SQLAlchemy mapper registry
from app.modules.auth.models import User
from app.modules.quiz.models import (
    Category, Quiz, Question, QuizAttempt, UserAnswer, QuizSession,
    UserQuestionNote, Tag, QuizTag, QuizRoom, QuizRoomParticipant,
    QuizRoomChat, QuizCollaborator, UserQuizGoal, UserDailyProgress,
    UserQuestionMastery, UserDeckSettings
)

from app.core.db import SessionLocal
from sqlalchemy.future import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(Question))
        questions = result.scalars().all()
        updated_count = 0
        
        for q in questions:
            changed = False
            # Clean up q.audio (front audio URL)
            if q.audio and ("/static/uploads/" in q.audio) and q.audio.startswith("http"):
                match = re.search(r"(/static/uploads/.*)$", q.audio)
                if match:
                    old = q.audio
                    q.audio = match.group(1)
                    print(f"Question #{q.id} front audio: {old} -> {q.audio}")
                    changed = True
            
            # Clean up q.others for back_audio_url
            if q.others and isinstance(q.others, dict):
                back_audio = q.others.get("back_audio_url")
                if back_audio and ("/static/uploads/" in back_audio) and back_audio.startswith("http"):
                    match = re.search(r"(/static/uploads/.*)$", back_audio)
                    if match:
                        old = back_audio
                        q.others["back_audio_url"] = match.group(1)
                        print(f"Question #{q.id} back audio: {old} -> {q.others['back_audio_url']}")
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(q, "others")
                        changed = True
            
            if changed:
                updated_count += 1
                
        if updated_count > 0:
            await db.commit()
            print(f"Successfully converted {updated_count} questions' audio URLs to relative paths.")
        else:
            print("No absolute audio URLs found to convert.")

if __name__ == '__main__':
    asyncio.run(main())
