from fastapi import APIRouter, UploadFile, File, Form, Depends, Request, BackgroundTasks
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.deck.services.excel_service import ExcelDeckService
from app.modules.deck.services.deck_service import DeckService
from app.modules.deck.services.ai_service import ai_service
from app.modules.deck.schemas import DeckSchema, CardSchema
from app.modules.deck.models import UserDeckSettings
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Deck"])

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
async def preview_deck(file: UploadFile = File(...)):
    try:
        import asyncio
        content = await file.read()
        metadata, cards = await asyncio.to_thread(ExcelDeckService.parse_deck_excel, content)
        return {
            "metadata": metadata,
            "questions": cards, # keep questions key for frontend compatibility
            "cards": cards,
            "count": len(cards)
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/upload")
async def upload_deck(request: Request, file: UploadFile = File(...), metadata_override: Optional[str] = Form(None), db: AsyncSession = Depends(get_db)):
    try:
        import asyncio
        content = await file.read()
        print(f"DEBUG: Starting ingestion for {file.filename} ({len(content)} bytes)")
        
        # Run synchronous parsing in a thread to avoid blocking the event loop
        file_metadata, cards = await asyncio.to_thread(ExcelDeckService.parse_deck_excel, content)
        
        # Apply overrides if provided
        metadata = file_metadata
        if metadata_override:
            try:
                overrides = json.loads(metadata_override)
                metadata.update(overrides)
                print(f"DEBUG: Applied metadata overrides: {overrides}")
            except Exception as e:
                print(f"ERROR: Failed to parse metadata overrides: {e}")
        
        if not cards:
            print("DEBUG: No valid cards extracted from file.")
            return JSONResponse(status_code=400, content={"error": "No valid flashcards found in Excel file."})

        # Use category from metadata
        category_name = metadata.get("category", "General")
        from app.modules.deck.models import Category
        result = await db.execute(select(Category).filter(Category.name == category_name))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
            db.add(db_cat)
            await db.commit()
            await db.refresh(db_cat)

        # Create deck using Info sheet metadata
        user_id = int(request.cookies.get("user_id", 1))
        deck_data = DeckSchema(
            title=metadata.get("title", f"Import: {file.filename.split('.')[0]}"),
            description=metadata.get("description", f"Batch import with {len(cards)} cards."),
            category_id=db_cat.id,
            creator_id=user_id,
            is_active=True
        )
        db_deck = await DeckService.create_deck(db, deck_data)
        
        # Save practice settings if defined in metadata
        if "practice_settings" in metadata:
            db_deck.practice_settings = metadata["practice_settings"]
            await db.flush()
        
        print(f"DEBUG: Deck created ID={db_deck.id}. Adding {len(cards)} cards...")
        
        card_schemas = []
        for c in cards:
            card_schemas.append(CardSchema(
                content=c["content"],
                front_audio_content=c.get("front_audio_content"),
                back_audio_content=c.get("back_audio_content"),
                front_audio_url=c.get("front_audio_url"),
                back_audio_url=c.get("back_audio_url"),
                front_img=c.get("front_img"),
                back_img=c.get("back_img"),
                question_type=c.get("question_type", "flashcard"),
                explanation=c["explanation"],
                others=c.get("others")
            ))
        await DeckService.bulk_add_cards(db, db_deck.id, card_schemas)
            
        # Add tags if present
        if metadata.get("tags"):
            await DeckService.set_deck_tags(db, db_deck.id, metadata["tags"])

        # Auto-enroll the creator so it shows in "My Collection" and "Creator Studio"
        from app.modules.deck.models import DeckAttempt
        user_id = int(request.cookies.get("user_id", 1))
        attempt = DeckAttempt(
            user_id=user_id,
            deck_id=db_deck.id,
            mode="sequential",
            score=0,
            total_cards=0,
            is_archived=False
        )
        db.add(attempt)
        await db.commit()
            
        print(f"DEBUG: Ingestion successful for {file.filename}")
        return {"status": "ok", "message": "Deck import successfully stabilized."}
        
    except Exception as e:
        import traceback
        err_trace = traceback.format_exc()
        print(f"CRITICAL: Upload Error: {err_trace}")
        return JSONResponse(status_code=500, content={"error": f"Internal matrix error: {str(e)}"})

@router.post("/import-text")
async def import_text(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        
        title = data.get("title", "Quick Text Import")
        description = data.get("description", "Imported via copy-paste.")
        category_name = data.get("category", "General")
        tags = data.get("tags", [])
        cards = data.get("cards", [])
        
        if not cards:
            return JSONResponse(status_code=400, content={"error": "No valid cards provided."})
            
        # Get or create category
        from app.modules.deck.models import Category
        result = await db.execute(select(Category).filter(Category.name == category_name))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            db_cat = Category(name=category_name, description="Created during quick import")
            db.add(db_cat)
            await db.commit()
            await db.refresh(db_cat)
            
        deck_data = DeckSchema(
            title=title,
            description=description,
            category_id=db_cat.id,
            creator_id=user_id,
            is_active=True
        )
        db_deck = await DeckService.create_deck(db, deck_data)
        
        card_schemas = []
        for c in cards:
            card_schemas.append(CardSchema(
                content=c.get("content", "").strip(),
                front_audio_content=c.get("front_audio_content"),
                back_audio_content=c.get("back_audio_content"),
                front_audio_url=c.get("front_audio_url"),
                back_audio_url=c.get("back_audio_url"),
                front_img=c.get("front_img"),
                back_img=c.get("back_img"),
                question_type="flashcard",
                explanation=c.get("explanation", "").strip(),
                others=c.get("others", {})
            ))
        await DeckService.bulk_add_cards(db, db_deck.id, card_schemas)
        
        if tags:
            await DeckService.set_deck_tags(db, db_deck.id, tags)
            
        # Auto-enroll the creator
        from app.modules.deck.models import DeckAttempt
        attempt = DeckAttempt(
            user_id=user_id,
            deck_id=db_deck.id,
            mode="sequential",
            score=0,
            total_cards=0,
            is_archived=False
        )
        db.add(attempt)
        await db.commit()
        
        return {"status": "ok", "message": "Deck import successfully stabilized."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/create")
async def create_deck_endpoint(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        cover_image = data.get("cover_image", "").strip() or None
        is_public = data.get("is_public", True)
        
        if not title:
            return JSONResponse(status_code=400, content={"error": "Deck title cannot be empty"})
            
        # Get or create General category
        from app.modules.deck.models import Category
        result = await db.execute(select(Category).filter(Category.name == "General"))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            db_cat = Category(name="General", description="Default category for manual creations")
            db.add(db_cat)
            await db.commit()
            await db.refresh(db_cat)
            
        deck_data = DeckSchema(
            title=title,
            description=description,
            category_id=db_cat.id,
            creator_id=user_id,
            cover_image=cover_image,
            is_active=True,
            is_public=is_public
        )
        db_deck = await DeckService.create_deck(db, deck_data)
        
        # Auto-enroll the creator
        from app.modules.deck.models import DeckAttempt
        attempt = DeckAttempt(
            user_id=user_id,
            deck_id=db_deck.id,
            mode="sequential",
            score=0,
            total_cards=0,
            is_archived=False
        )
        db.add(attempt)
        await db.commit()
        
        return {"status": "ok", "id": db_deck.id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/validate")
async def validate_deck(file: UploadFile = File(...)):
    try:
        content = await file.read()
        metadata, cards = await asyncio.to_thread(ExcelDeckService.parse_deck_excel, content)
        return {
            "metadata": metadata,
            "questions_count": len(cards), # keep for frontend
            "cards_count": len(cards),
            "sample": cards[:5]
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Validation Error: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "details": error_details}
        )

@router.get("/{deck_id}/questions")
@router.get("/{deck_id}/flashcards")
@router.get("/{deck_id}/cards")
async def get_deck_cards(deck_id: int, request: Request, page: int = 1, size: int = 50, search: str = "", db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    
    query = select(Flashcard).where(Flashcard.deck_id == deck_id)
    if search:
        query = query.filter(Flashcard.content.ilike(f"%{search}%"))
    
    # Count total for pagination
    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_res.scalar()
    
    # Get paginated results
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    cs = result.scalars().all()
    
    # Fetch stats and mastery for these cards
    from app.modules.deck.models import UserAnswer, UserCardMastery
    user_id = int(request.cookies.get("user_id", 1))
    c_ids = [c.id for c in cs]
    stats_query = select(
        UserAnswer.card_id,
        func.count(UserAnswer.id).label("total"),
        func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct")
    ).where(UserAnswer.card_id.in_(c_ids)).group_by(UserAnswer.card_id)
    stats_res = await db.execute(stats_query)
    stats_map = {r.card_id: {"total": r.total, "correct": r.correct, "wrong": r.total - r.correct} for r in stats_res}
    
    mastery_query = select(UserCardMastery).where(
        UserCardMastery.user_id == user_id, 
        UserCardMastery.card_id.in_(c_ids)
    )
    mastery_res = await db.execute(mastery_query)
    mastery_map = {m.card_id: m.is_ignored for m in mastery_res.scalars().all()}
    
    return {
        "questions": [
            {
                "id": c.id,
                "orig_index": (page - 1) * size + i + 1,
                "content": c.content,
                "explanation": c.explanation,
                "front_audio_content": c.front_audio_content,
                "back_audio_content": c.back_audio_content,
                "front_audio_url": c.front_audio_url,
                "back_audio_url": c.back_audio_url,
                "front_img": c.front_img,
                "back_img": c.back_img,
                "others": c.others or {},
                "points": 1,
                "stats": stats_map.get(c.id, {"total": 0, "correct": 0, "wrong": 0}),
                "is_ignored": mastery_map.get(c.id, False),
                "options": []
            } for i, c in enumerate(cs)
        ],
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/{deck_id}/enroll")
async def enroll_deck(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckAttempt
    user_id = int(request.cookies.get("user_id", 1))
    
    # Check if already enrolled
    result = await db.execute(
        select(DeckAttempt).where(DeckAttempt.user_id == user_id, DeckAttempt.deck_id == deck_id)
    )
    existing_attempts = result.scalars().all()
    
    if not existing_attempts:
        attempt = DeckAttempt(
            user_id=user_id,
            deck_id=deck_id,
            mode="sequential",
            score=0,
            total_cards=0,
            is_archived=False
        )
        db.add(attempt)
    else:
        for att in existing_attempts:
            att.is_archived = False
    
    await db.commit()
    return {"status": "ok"}

@router.post("/{deck_id}/archive")
async def archive_deck(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckAttempt
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(DeckAttempt).where(DeckAttempt.user_id == user_id, DeckAttempt.deck_id == deck_id))
    attempts = result.scalars().all()
    if attempts:
        new_status = not attempts[0].is_archived
        for attempt in attempts:
            attempt.is_archived = new_status
        await db.commit()
    return {"status": "ok"}

@router.delete("/{deck_id}")
async def delete_deck(deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import (
        FlashcardDeck, Flashcard, DeckAttempt, DeckSession, 
        DeckRoom, UserDeckGoal, UserDeckSettings, DeckCollaborator,
        UserCardMastery, UserPracticeStats, UserCardNote, UserAnswer
    )
    
    # 1. Get all card IDs belonging to this deck
    card_ids_res = await db.execute(select(Flashcard.id).where(Flashcard.deck_id == deck_id))
    card_ids = [r[0] for r in card_ids_res.all()]
    
    if card_ids:
        # 2. Delete child records referencing flashcards
        await db.execute(delete(UserCardMastery).where(UserCardMastery.card_id.in_(card_ids)))
        await db.execute(delete(UserPracticeStats).where(UserPracticeStats.card_id.in_(card_ids)))
        await db.execute(delete(UserCardNote).where(UserCardNote.card_id.in_(card_ids)))
        await db.execute(delete(UserAnswer).where(UserAnswer.card_id.in_(card_ids)))
        
        # 3. Delete flashcards
        await db.execute(delete(Flashcard).where(Flashcard.id.in_(card_ids)))
        
    # 4. Delete records referencing deck_id
    await db.execute(delete(DeckAttempt).where(DeckAttempt.deck_id == deck_id))
    await db.execute(delete(DeckSession).where(DeckSession.deck_id == deck_id))
    await db.execute(delete(DeckRoom).where(DeckRoom.deck_id == deck_id))
    await db.execute(delete(UserDeckGoal).where(UserDeckGoal.deck_id == deck_id))
    await db.execute(delete(UserDeckSettings).where(UserDeckSettings.deck_id == deck_id))
    await db.execute(delete(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id))
    
    # 5. Delete the deck
    await db.execute(delete(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    await db.commit()
    return {"status": "ok"}

@router.patch("/{deck_id}")
async def update_deck(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.deck.models import FlashcardDeck, DeckCollaborator
    
    result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = result.scalar_one_or_none()
    if not deck: return JSONResponse(status_code=404, content={"error": "Deck not found"})
    
    # Permission Check: Creator, Admin, or Collaborator
    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"
    
    if deck.creator_id != user_id and user_id != 1 and not is_admin:
        collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
        if not collab_res.scalar():
            return JSONResponse(status_code=403, content={"error": "Permission denied"})
    
    if "title" in data: deck.title = data["title"]
    if "description" in data: deck.description = data["description"]
    if "category_id" in data: deck.category_id = data["category_id"]
    if "instruction" in data: deck.instruction = data["instruction"]
    if "is_public" in data: deck.is_public = data["is_public"]
    
    if "tags" in data:
        await DeckService.set_deck_tags(db, deck_id, data["tags"])
    
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

@router.get("/{deck_id}/collaborators")
async def get_collaborators(deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import DeckCollaborator
    from app.modules.auth.models import User
    result = await db.execute(
        select(User).join(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id)
    )
    collabs = result.scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in collabs]

@router.post("/{deck_id}/collaborators")
async def add_collaborator(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.deck.models import FlashcardDeck, DeckCollaborator
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    
    if not deck or (deck.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can add collaborators"})
        
    existing = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == target_user_id))
    if existing.scalar():
        return {"status": "ok", "message": "Already a collaborator"}
        
    new_collab = DeckCollaborator(deck_id=deck_id, user_id=target_user_id)
    db.add(new_collab)
    await db.commit()
    return {"status": "ok"}

@router.delete("/{deck_id}/collaborators/{collab_user_id}")
async def remove_collaborator(request: Request, deck_id: int, collab_user_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    from app.modules.deck.models import FlashcardDeck, DeckCollaborator
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    
    if not deck or (deck.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can remove collaborators"})
        
    await db.execute(delete(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == collab_user_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/{deck_id}/transfer-ownership")
async def transfer_ownership(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.deck.models import FlashcardDeck
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    
    if not deck or (deck.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only current creator can transfer ownership"})
        
    deck.creator_id = target_user_id
    await db.commit()
    return {"status": "ok"}

@router.post("/{deck_id}/flashcard")
@router.post("/{deck_id}/card")
async def create_card(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import DeckCollaborator
    from app.modules.auth.models import User as UserDB
    is_owner = deck.creator_id == user_id
    collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"
    
    if not (is_owner or is_collaborator or user_id == 1 or is_admin):
        return JSONResponse(status_code=403, content={"error": "No permission to add cards to this deck"})
        
    content = data.get("content", "").strip()
    explanation = data.get("explanation", "").strip()
    if not content:
        return JSONResponse(status_code=400, content={"error": "Card content cannot be empty"})
        
    from app.modules.deck.models import Flashcard
    db_c = Flashcard(
        deck_id=deck_id,
        content=content,
        explanation=explanation,
        front_audio_content=data.get("front_audio_content"),
        back_audio_content=data.get("back_audio_content"),
        front_audio_url=data.get("front_audio_url") or data.get("audio"),
        back_audio_url=data.get("back_audio_url"),
        front_img=data.get("front_img"),
        back_img=data.get("back_img"),
        question_type=data.get("question_type", "flashcard"),
        others=data.get("others") or {}
    )
    db.add(db_c)
    await db.commit()
    await db.refresh(db_c)
    
    return {
        "status": "ok",
        "id": db_c.id,
        "card": {
            "id": db_c.id,
            "content": db_c.content,
            "explanation": db_c.explanation,
            "front_audio_content": db_c.front_audio_content,
            "back_audio_content": db_c.back_audio_content,
            "front_audio_url": db_c.front_audio_url,
            "audio": db_c.audio,
            "back_audio_url": db_c.back_audio_url,
            "front_img": db_c.front_img,
            "back_img": db_c.back_img,
            "others": db_c.others,
            "options": []
        }
    }

@router.patch("/question/{card_id}")
@router.patch("/flashcard/{card_id}")
@router.patch("/card/{card_id}")
async def update_card(card_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    result = await db.execute(select(Flashcard).where(Flashcard.id == card_id))
    card = result.scalar_one_or_none()
    if not card: return JSONResponse(status_code=404, content={"error": "Card not found"})
    
    if "content" in data: card.content = data["content"]
    if "explanation" in data: card.explanation = data["explanation"]
    if "front_audio_content" in data: card.front_audio_content = data["front_audio_content"]
    if "back_audio_content" in data: card.back_audio_content = data["back_audio_content"]
    if "front_audio_url" in data: card.front_audio_url = data["front_audio_url"]
    if "audio" in data: card.audio = data["audio"]
    if "back_audio_url" in data: card.back_audio_url = data["back_audio_url"]
    if "front_img" in data: card.front_img = data["front_img"]
    if "back_img" in data: card.back_img = data["back_img"]
    if "others" in data:
        if not card.others:
            card.others = {}
        # Merge or overwrite others dict
        card.others = {**card.others, **data["others"]}
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(card, "others")
    
    await db.commit()
    return {"status": "ok"}

@router.delete("/question/{card_id}")
@router.delete("/flashcard/{card_id}")
@router.delete("/card/{card_id}")
async def delete_card(card_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard, UserCardMastery, UserPracticeStats, UserCardNote, UserAnswer
    await db.execute(delete(UserCardMastery).where(UserCardMastery.card_id == card_id))
    await db.execute(delete(UserPracticeStats).where(UserPracticeStats.card_id == card_id))
    await db.execute(delete(UserCardNote).where(UserCardNote.card_id == card_id))
    await db.execute(delete(UserAnswer).where(UserAnswer.card_id == card_id))
    await db.execute(delete(Flashcard).where(Flashcard.id == card_id))
    await db.commit()
    return {"status": "ok"}
