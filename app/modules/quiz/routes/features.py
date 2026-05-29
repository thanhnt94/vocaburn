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

def migrate_practice_settings(settings: Optional[dict]) -> dict:
    if not settings:
        return {}
    if any(k in settings for k in ("mcq", "typing", "listening")):
        return settings
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    return {
        "mcq": {"active_pairs": active_pairs, "num_choices": num_choices},
        "typing": {"active_pairs": active_pairs},
        "listening": {"active_pairs": active_pairs, "num_choices": num_choices}
    }

@router.get("/{quiz_id}/practice-settings")
async def get_practice_settings(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    # Query user settings
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == quiz_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    
    # Dynamically extract all available data columns in this deck
    from app.modules.quiz.models import Question
    available_cols = {"front", "back"}
    questions_stmt = select(Question.others).where(Question.quiz_id == quiz_id)
    res = await db.execute(questions_stmt)
    for others_json in res.scalars():
        if others_json and isinstance(others_json, dict):
            # Exclude technical/internal columns like front_audio_url if we want,
            # but letting them show is also fine. Let's filter out obviously technical ones:
            for k in others_json.keys():
                if k not in ("id", "item_id", "order_in_container") and not k.endswith("_audio_url") and not k.endswith("_img") and k != "image" and k != "audio" and k != "other_content":
                    available_cols.add(k)
                    
    return {
        "creator_settings": migrate_practice_settings(quiz.practice_settings),
        "user_settings": migrate_practice_settings(user_sett.settings) if user_sett else None,
        "available_columns": sorted(list(available_cols))
    }

@router.post("/{quiz_id}/practice-settings")
async def save_practice_settings(request: Request, quiz_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    is_creator = payload.get("is_creator", False)
    settings = payload.get("settings")
    
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    if is_creator:
        # Check if user has permission to edit deck settings
        from app.modules.quiz.models import QuizCollaborator
        is_owner = quiz.creator_id == user_id
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        if not (is_owner or is_collaborator or user_id == 1):
            return JSONResponse(status_code=403, content={"error": "No permission to save deck default settings"})
            
        quiz.practice_settings = settings
    else:
        # Save user settings
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == quiz_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none()
        if not user_sett:
            user_sett = UserDeckSettings(user_id=user_id, deck_id=quiz_id, settings=settings)
            db.add(user_sett)
        else:
            user_sett.settings = settings
            
    await db.commit()
    return {"status": "ok"}

def fix_static_urls(val):
    if not val:
        return val
    if isinstance(val, str):
        return val.replace("/static/uploads/", "/uploads/")
    if isinstance(val, dict):
        return {k: fix_static_urls(v) for k, v in val.items()}
    if isinstance(val, list):
        return [fix_static_urls(v) for v in val]
    return val

@router.get("/question/{question_id}/note")
async def get_question_note(request: Request, question_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserQuestionNote).where(UserQuestionNote.user_id == user_id, UserQuestionNote.question_id == question_id)
    )
    note = result.scalar_one_or_none()
    return {"content": note.content if note else ""}

@router.post("/question/{question_id}/note")
async def save_question_note(request: Request, question_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote
    user_id = int(request.cookies.get("user_id", 1))
    content = data.get("content", "")
    
    result = await db.execute(
        select(UserQuestionNote).where(UserQuestionNote.user_id == user_id, UserQuestionNote.question_id == question_id)
    )
    note = result.scalar_one_or_none()
    
    if note:
        note.content = content
    else:
        note = UserQuestionNote(user_id=user_id, question_id=question_id, content=content)
        db.add(note)
    
    await db.commit()
    return {"status": "ok"}

@router.get("/{quiz_id}/notes")
async def get_quiz_notes(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote, Question
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserQuestionNote).join(Question).where(UserQuestionNote.user_id == user_id, Question.quiz_id == quiz_id)
    )
    notes = result.scalars().all()
    return {n.question_id: n.content for n in notes}

@router.get("/{quiz_id}/export")
async def export_quiz(quiz_id: int, request: Request, exclude_ids: bool = False, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.modules.quiz.models import Quiz
    
    stmt = select(Quiz).options(joinedload(Quiz.category), joinedload(Quiz.tags)).where(Quiz.id == quiz_id)
    res = await db.execute(stmt)
    quiz = res.scalars().first()
    if not quiz:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.quiz.models import Question
    q_stmt = select(Question).where(Question.quiz_id == quiz_id)
    res = await db.execute(q_stmt)
    questions = res.scalars().all()
    
    category_name = quiz.category.name if quiz.category else "General"
    tags = [t.name for t in quiz.tags]
    
    excel_bytes = ExcelQuizService.export_quiz_to_excel(
        quiz_title=quiz.title,
        quiz_description=quiz.description,
        category_name=category_name,
        tags=tags,
        practice_settings=quiz.practice_settings,
        questions=questions,
        exclude_ids=exclude_ids
    )
    
    from fastapi.responses import Response
    import urllib.parse
    encoded_filename = urllib.parse.quote(f"{quiz.title}.xlsx")
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

@router.post("/{quiz_id}/import-update")
async def import_update_quiz(request: Request, quiz_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        quiz = await QuizService.get_quiz_by_id(db, quiz_id)
        if not quiz:
            return JSONResponse(status_code=404, content={"error": "Deck not found"})
            
        from app.modules.quiz.models import QuizCollaborator
        is_owner = quiz.creator_id == user_id
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        if not (is_owner or is_collaborator or user_id == 1):
            return JSONResponse(status_code=403, content={"error": "No permission to update this deck"})
            
        content = await file.read()
        import asyncio
        metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        
        if not questions:
            return JSONResponse(status_code=400, content={"error": "No valid questions found in Excel file."})
            
        quiz.title = metadata.get("title", quiz.title)
        quiz.description = metadata.get("description", quiz.description)
        
        category_name = metadata.get("category")
        if category_name:
            from app.modules.quiz.models import Category
            cat_res = await db.execute(select(Category).filter(Category.name == category_name))
            db_cat = cat_res.scalar_one_or_none()
            if not db_cat:
                db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
                db.add(db_cat)
                await db.flush()
            quiz.category_id = db_cat.id
            
        if "practice_settings" in metadata:
            quiz.practice_settings = metadata["practice_settings"]
            
        if metadata.get("tags"):
            await QuizService.set_quiz_tags(db, quiz_id, metadata["tags"])
            
        from app.modules.quiz.models import Question
        existing_q_res = await db.execute(select(Question).filter(Question.quiz_id == quiz_id))
        existing_q_map = {q.id: q for q in existing_q_res.scalars().all()}
        
        for q_data in questions:
            q_id = q_data.get("id")
            
            if q_id and q_id in existing_q_map:
                db_q = existing_q_map[q_id]
                db_q.content = q_data["content"]
                db_q.explanation = q_data["explanation"]
                db_q.ai_explanation = q_data.get("ai_explanation")
                db_q.image = q_data.get("image")
                db_q.audio = q_data.get("audio")
                db_q.others = q_data.get("others")
            else:
                db_q = Question(
                    quiz_id=quiz_id,
                    content=q_data["content"],
                    explanation=q_data["explanation"],
                    ai_explanation=q_data.get("ai_explanation"),
                    image=q_data.get("image"),
                    audio=q_data.get("audio"),
                    question_type=q_data.get("question_type", "flashcard"),
                    others=q_data.get("others")
                )
                db.add(db_q)
                
        await db.commit()
        return {"status": "ok", "message": "Deck updated successfully."}
        
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/generate-audio/{question_id}")
async def generate_question_audio(question_id: int, request: Request, face: str = "front", db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question
    res = await db.execute(select(Question).filter(Question.id == question_id))
    q = res.scalar_one_or_none()
    if not q:
        return JSONResponse(status_code=404, content={"error": "Question not found"})
        
    from app.modules.quiz.services.audio_generator import AudioGenerator
    
    # Select text based on face - strictly require front_audio_content / back_audio_content
    text = ""
    if face == "front":
        text = q.others.get("front_audio_content") if q.others else None
    else:
        text = q.others.get("back_audio_content") if q.others else None
            
    if not text or not text.strip():
        return JSONResponse(status_code=400, content={"error": "Audio reading script is empty. Cannot generate audio."})
        
    # Determine physical path and absolute URL based on requested quiz_id and question_id
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(q.quiz_id), "audio")
    filename = f"{q.id}_front.mp3" if face == "front" else f"{q.id}_back.mp3"
    physical_path = os.path.join(folder_path, filename)
    
    # Construct relative URL
    url = f"/uploads/{q.quiz_id}/audio/{filename}"
    
    # Check if we already have it generated on disk
    if os.path.exists(physical_path):
        # File is on disk, just make sure database is synchronized
        db_updated = False
        if face == "front":
            if q.audio != url:
                q.audio = url
                db_updated = True
        else:
            if not q.others:
                q.others = {}
            if q.others.get("back_audio_url") != url:
                q.others["back_audio_url"] = url
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(q, "others")
                db_updated = True
        if db_updated:
            await db.commit()
        return {"url": url}
        
    # Generate if not exists
    try:
        success = await AudioGenerator.generate_tts(text, physical_path)
        if not success:
            return JSONResponse(status_code=500, content={"error": "Failed to generate audio"})
    except Exception as e:
        import traceback
        logger.error(f"Failed to generate audio: {e}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": f"Failed to generate audio: {str(e)}"})
        
    # Save back to database
    if face == "front":
        q.audio = url
    else:
        if not q.others:
            q.others = {}
        q.others["back_audio_url"] = url
        # Mark others dirty for SQLAlchemy JSON tracking
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(q, "others")
        
    await db.commit()
    return {"url": url}

