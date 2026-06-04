from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.quiz.services.excel_service import ExcelQuizService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.quiz.services.ai_service import ai_service
from app.modules.quiz.schemas import QuizSchema, QuestionSchema
from app.modules.quiz.models import UserDeckSettings
from app.modules.quiz.services.mcq_engine import MCQEngine
from app.modules.quiz.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Quiz"])

def build_fsrs_card(mastery, now_utc):
    from fsrs import Card, State
    state_map = {
        0: State.Learning,
        1: State.Learning,
        2: State.Review,
        3: State.Relearning
    }
    card_state = state_map.get(mastery.state if mastery else 0, State.Learning)
    if card_state in (State.Review, State.Relearning) and (not mastery or mastery.stability is None or mastery.difficulty is None):
        card_state = State.Learning
        
    fsrs_card = Card()
    if mastery:
        fsrs_card.state = card_state
        fsrs_card.step = mastery.step
        fsrs_card.stability = mastery.stability
        fsrs_card.difficulty = mastery.difficulty
        fsrs_card.due = mastery.due.replace(tzinfo=timezone.utc) if mastery.due else now_utc
        fsrs_card.last_review = mastery.last_review.replace(tzinfo=timezone.utc) if mastery.last_review else None
    else:
        fsrs_card.state = State.Learning
        fsrs_card.step = 0
        fsrs_card.stability = None
        fsrs_card.difficulty = None
        fsrs_card.due = now_utc
        fsrs_card.last_review = None
    return fsrs_card


@router.get("/template/download")
async def download_template():
    import os
    path = "app/static/QuizMind_Template.xlsx"
    if os.path.exists(path):
        return FileResponse(path, filename="QuizMind_Template.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return {"error": "Template not found"}

@router.post("/preview")
async def preview_quiz(file: UploadFile = File(...)):
    try:
        import asyncio
        content = await file.read()
        metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        return {
            "metadata": metadata,
            "questions": questions,
            "count": len(questions)
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/upload")
async def upload_quiz(request: Request, file: UploadFile = File(...), metadata_override: str = None, db: AsyncSession = Depends(get_db)):
    try:
        import asyncio
        content = await file.read()
        print(f"DEBUG: Starting ingestion for {file.filename} ({len(content)} bytes)")
        
        # Run synchronous parsing in a thread to avoid blocking the event loop
        file_metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        
        # Apply overrides if provided
        metadata = file_metadata
        if metadata_override:
            try:
                overrides = json.loads(metadata_override)
                metadata.update(overrides)
                print(f"DEBUG: Applied metadata overrides: {overrides}")
            except Exception as e:
                print(f"ERROR: Failed to parse metadata overrides: {e}")
        
        if not questions:
            print("DEBUG: No valid questions extracted from file.")
            return JSONResponse(status_code=400, content={"error": "No valid questions found in Excel file."})

        # Use category from metadata
        category_name = metadata.get("category", "General")
        from app.modules.quiz.models import Category
        result = await db.execute(select(Category).filter(Category.name == category_name))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
            db.add(db_cat)
            await db.commit()
            await db.refresh(db_cat)

        # Create quiz using Info sheet metadata
        user_id = int(request.cookies.get("user_id", 1))
        quiz_data = QuizSchema(
            title=metadata.get("title", f"Import: {file.filename.split('.')[0]}"),
            description=metadata.get("description", f"Batch import with {len(questions)} questions."),
            category_id=db_cat.id,
            creator_id=user_id,
            is_active=True
        )
        db_quiz = await QuizService.create_quiz(db, quiz_data)
        
        # Save practice settings if defined in metadata
        if "practice_settings" in metadata:
            db_quiz.practice_settings = metadata["practice_settings"]
            await db.flush()
        
        print(f"DEBUG: Quiz created ID={db_quiz.id}. Adding {len(questions)} questions...")
        
        question_schemas = []
        for q in questions:
            question_schemas.append(QuestionSchema(
                content=q["content"],
                image=q.get("image"),
                audio=q.get("audio"),
                question_type=q.get("question_type", "normal"),
                explanation=q["explanation"],
                ai_explanation=q.get("ai_explanation"),
                others=q.get("others")
            ))
        await QuizService.bulk_add_questions(db, db_quiz.id, question_schemas)
            
        # Add tags if present
        if metadata.get("tags"):
            await QuizService.set_quiz_tags(db, db_quiz.id, metadata["tags"])

        # Auto-enroll the creator so it shows in "My Collection" and "Creator Studio"
        from app.modules.quiz.models import QuizAttempt
        user_id = int(request.cookies.get("user_id", 1))
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=db_quiz.id,
            mode="sequential",
            score=0,
            total_questions=0,
            is_archived=False
        )
        db.add(attempt)
        await db.commit()
            
        print(f"DEBUG: Neural ingestion successful for {file.filename}")
        return {"status": "ok", "message": "Neural patterns stabilized successfully."}
        
    except Exception as e:
        import traceback
        err_trace = traceback.format_exc()
        print(f"CRITICAL: Upload Error: {err_trace}")
        return JSONResponse(status_code=500, content={"error": f"Internal matrix error: {str(e)}"})

@router.post("/validate")
async def validate_quiz(file: UploadFile = File(...)):
    try:
        content = await file.read()
        metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        return {
            "metadata": metadata,
            "questions_count": len(questions),
            "sample": questions[:5]
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Validation Error: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "details": error_details}
        )

@router.get("/{quiz_id}/questions")
async def get_quiz_questions(quiz_id: int, request: Request, page: int = 1, size: int = 50, search: str = "", db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question
    
    query = select(Question).where(Question.quiz_id == quiz_id)
    if search:
        query = query.filter(Question.content.ilike(f"%{search}%"))
    
    # Count total for pagination
    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_res.scalar()
    
    # Get paginated results
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    qs = result.scalars().all()
    
    # Fetch stats and mastery for these questions
    from app.modules.quiz.models import UserAnswer, UserQuestionMastery
    user_id = int(request.cookies.get("user_id", 1))
    q_ids = [q.id for q in qs]
    stats_query = select(
        UserAnswer.question_id,
        func.count(UserAnswer.id).label("total"),
        func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct")
    ).where(UserAnswer.question_id.in_(q_ids)).group_by(UserAnswer.question_id)
    stats_res = await db.execute(stats_query)
    stats_map = {r.question_id: {"total": r.total, "correct": r.correct, "wrong": r.total - r.correct} for r in stats_res}
    
    mastery_query = select(UserQuestionMastery).where(
        UserQuestionMastery.user_id == user_id, 
        UserQuestionMastery.question_id.in_(q_ids)
    )
    mastery_res = await db.execute(mastery_query)
    mastery_map = {m.question_id: m.is_ignored for m in mastery_res.scalars().all()}
    
    return {
        "questions": [
            {
                "id": q.id,
                "orig_index": (page - 1) * size + i + 1,
                "content": q.content,
                "explanation": q.explanation,
                "ai_explanation": q.ai_explanation,
                "points": 1,
                "image": q.image,
                "audio": q.audio,
                "stats": stats_map.get(q.id, {"total": 0, "correct": 0, "wrong": 0}),
                "is_ignored": mastery_map.get(q.id, False),
                "options": []
            } for i, q in enumerate(qs)
        ],
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/{quiz_id}/enroll")
async def enroll_quiz(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizAttempt
    user_id = int(request.cookies.get("user_id", 1))
    
    # Check if already enrolled
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=quiz_id,
            mode="sequential",
            score=0,
            total_questions=0,
            is_archived=False
        )
        db.add(attempt)
    else:
        existing.is_archived = False
    
    await db.commit()
    return {"status": "ok"}

@router.post("/{quiz_id}/archive")
async def archive_quiz(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizAttempt
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id))
    attempt = result.scalar_one_or_none()
    if attempt:
        attempt.is_archived = not attempt.is_archived
        await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Quiz
    await db.execute(delete(Quiz).where(Quiz.id == quiz_id))
    await db.commit()
    return {"status": "ok"}

@router.patch("/{quiz_id}")
async def update_quiz(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.quiz.models import Quiz, QuizCollaborator
    
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    # Permission Check: Creator, Admin, or Collaborator
    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"
    
    if quiz.creator_id != user_id and user_id != 1 and not is_admin:
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        if not collab_res.scalar():
            return JSONResponse(status_code=403, content={"error": "Permission denied"})
    
    if "title" in data: quiz.title = data["title"]
    if "description" in data: quiz.description = data["description"]
    if "category_id" in data: quiz.category_id = data["category_id"]
    if "ai_prompt" in data: quiz.ai_prompt = data["ai_prompt"]
    if "instruction" in data: quiz.instruction = data["instruction"]
    
    if "tags" in data:
        await QuizService.set_quiz_tags(db, quiz_id, data["tags"])
    
    await db.commit()
    return {"status": "ok"}

# --- Collaborator Endpoints ---

@router.get("/users/search")
async def search_users(q: str, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.models import User
    result = await db.execute(
        select(User).filter(or_(User.username.ilike(f"%{q}%"), User.full_name.ilike(f"%{q}%"))).limit(10)
    )
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in users]

@router.get("/{quiz_id}/collaborators")
async def get_collaborators(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizCollaborator
    from app.modules.auth.models import User
    result = await db.execute(
        select(User).join(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id)
    )
    collabs = result.scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in collabs]

@router.post("/{quiz_id}/collaborators")
async def add_collaborator(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.quiz.models import Quiz, QuizCollaborator
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can add collaborators"})
        
    existing = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == target_user_id))
    if existing.scalar():
        return {"status": "ok", "message": "Already a collaborator"}
        
    new_collab = QuizCollaborator(quiz_id=quiz_id, user_id=target_user_id)
    db.add(new_collab)
    await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}/collaborators/{collab_user_id}")
async def remove_collaborator(request: Request, quiz_id: int, collab_user_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    from app.modules.quiz.models import Quiz, QuizCollaborator
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can remove collaborators"})
        
    await db.execute(delete(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == collab_user_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/{quiz_id}/transfer-ownership")
async def transfer_ownership(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.quiz.models import Quiz
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only current creator can transfer ownership"})
        
    quiz.creator_id = target_user_id
    await db.commit()
    return {"status": "ok"}

@router.patch("/question/{question_id}")
async def update_question(question_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question: return JSONResponse(status_code=404, content={"error": "Question not found"})
    
    if "content" in data: question.content = data["content"]
    if "explanation" in data: question.explanation = data["explanation"]
    if "ai_explanation" in data: question.ai_explanation = data["ai_explanation"]
    if "points" in data: question.points = data["points"]
    if "image" in data: question.image = data["image"]
    if "audio" in data: question.audio = data["audio"]
    if "others" in data:
        if not question.others:
            question.others = {}
        # Merge or overwrite others dict
        question.others = {**question.others, **data["others"]}
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(question, "others")
    
    await db.commit()
    return {"status": "ok"}

@router.delete("/question/{question_id}")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question
    await db.execute(delete(Question).where(Question.id == question_id))
    await db.commit()
    return {"status": "ok"}

