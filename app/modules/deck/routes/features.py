from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks
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

@router.get("/{deck_id}/practice-settings")
async def get_practice_settings(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    # Query user settings
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    
    # Dynamically extract all available data columns in this deck
    from app.modules.deck.models import Flashcard
    available_cols = {"front", "back"}
    cards_stmt = select(Flashcard.others).where(Flashcard.deck_id == deck_id)
    res = await db.execute(cards_stmt)
    for others_json in res.scalars():
        if others_json and isinstance(others_json, dict):
            for k in others_json.keys():
                if k not in ("id", "item_id", "order_in_container") and not k.endswith("_audio_url") and not k.endswith("_img") and k != "image" and k != "audio" and k != "other_content":
                    available_cols.add(k)
                    
    return {
        "creator_settings": migrate_practice_settings(deck.practice_settings),
        "user_settings": migrate_practice_settings(user_sett.settings) if user_sett else None,
        "available_columns": sorted(list(available_cols))
    }

@router.post("/{deck_id}/practice-settings")
async def save_practice_settings(request: Request, deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    is_creator = payload.get("is_creator", False)
    settings = payload.get("settings")
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    if is_creator:
        # Check if user has permission to edit deck settings
        from app.modules.deck.models import DeckCollaborator
        is_owner = deck.creator_id == user_id
        collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        if not (is_owner or is_collaborator or user_id == 1):
            return JSONResponse(status_code=403, content={"error": "No permission to save deck default settings"})
            
        deck.practice_settings = settings
    else:
        # Save user settings
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none()
        if not user_sett:
            user_sett = UserDeckSettings(user_id=user_id, deck_id=deck_id, settings=settings)
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

@router.get("/question/{card_id}/note")
@router.get("/flashcard/{card_id}/note")
@router.get("/card/{card_id}/note")
async def get_card_note(request: Request, card_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserCardNote
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserCardNote).where(UserCardNote.user_id == user_id, UserCardNote.card_id == card_id)
    )
    note = result.scalar_one_or_none()
    return {"content": note.content if note else ""}

@router.post("/question/{card_id}/note")
@router.post("/flashcard/{card_id}/note")
@router.post("/card/{card_id}/note")
async def save_card_note(request: Request, card_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserCardNote
    user_id = int(request.cookies.get("user_id", 1))
    content = data.get("content", "")
    
    result = await db.execute(
        select(UserCardNote).where(UserCardNote.user_id == user_id, UserCardNote.card_id == card_id)
    )
    note = result.scalar_one_or_none()
    
    if note:
        note.content = content
    else:
        note = UserCardNote(user_id=user_id, card_id=card_id, content=content)
        db.add(note)
    
    await db.commit()
    return {"status": "ok"}

@router.post("/question/{card_id}/ignore")
@router.post("/flashcard/{card_id}/ignore")
@router.post("/card/{card_id}/ignore")
async def toggle_card_ignore(request: Request, card_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserCardMastery
    user_id = int(request.cookies.get("user_id", 1))
    is_ignored = data.get("is_ignored", True)
    
    result = await db.execute(
        select(UserCardMastery).where(UserCardMastery.user_id == user_id, UserCardMastery.card_id == card_id)
    )
    mastery = result.scalar_one_or_none()
    
    if mastery:
        mastery.is_ignored = is_ignored
    else:
        mastery = UserCardMastery(user_id=user_id, card_id=card_id, is_ignored=is_ignored)
        db.add(mastery)
        
    await db.commit()
    return {"status": "ok", "is_ignored": is_ignored}

@router.get("/{deck_id}/notes")
async def get_deck_notes(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserCardNote, Flashcard
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserCardNote).join(Flashcard).where(UserCardNote.user_id == user_id, Flashcard.deck_id == deck_id)
    )
    notes = result.scalars().all()
    return {n.card_id: n.content for n in notes}

@router.get("/{deck_id}/export")
async def export_deck(deck_id: int, request: Request, exclude_ids: bool = False, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.modules.deck.models import FlashcardDeck
    
    stmt = select(FlashcardDeck).options(joinedload(FlashcardDeck.category), joinedload(FlashcardDeck.tags)).where(FlashcardDeck.id == deck_id)
    res = await db.execute(stmt)
    deck = res.scalars().first()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import Flashcard
    c_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
    res = await db.execute(c_stmt)
    cards = res.scalars().all()
    
    category_name = deck.category.name if deck.category else "General"
    tags = [t.name for t in deck.tags]
    
    excel_bytes = ExcelDeckService.export_deck_to_excel(
        deck_title=deck.title,
        deck_description=deck.description,
        category_name=category_name,
        tags=tags,
        practice_settings=deck.practice_settings,
        cards=cards,
        exclude_ids=exclude_ids
    )
    
    from fastapi.responses import Response
    import urllib.parse
    encoded_filename = urllib.parse.quote(f"{deck.title}.xlsx")
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

@router.post("/{deck_id}/import-update")
async def import_update_deck(request: Request, deck_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        deck = await DeckService.get_deck_by_id(db, deck_id)
        if not deck:
            return JSONResponse(status_code=404, content={"error": "Deck not found"})
            
        from app.modules.deck.models import DeckCollaborator
        is_owner = deck.creator_id == user_id
        collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        if not (is_owner or is_collaborator or user_id == 1):
            return JSONResponse(status_code=403, content={"error": "No permission to update this deck"})
            
        content = await file.read()
        import asyncio
        metadata, cards = await asyncio.to_thread(ExcelDeckService.parse_deck_excel, content)
        
        if not cards:
            return JSONResponse(status_code=400, content={"error": "No valid cards found in Excel file."})
            
        deck.title = metadata.get("title", deck.title)
        deck.description = metadata.get("description", deck.description)
        
        category_name = metadata.get("category")
        if category_name:
            from app.modules.deck.models import Category
            cat_res = await db.execute(select(Category).filter(Category.name == category_name))
            db_cat = cat_res.scalar_one_or_none()
            if not db_cat:
                db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
                db.add(db_cat)
                await db.flush()
            deck.category_id = db_cat.id
            
        if "practice_settings" in metadata:
            deck.practice_settings = metadata["practice_settings"]
            
        if metadata.get("tags"):
            await DeckService.set_deck_tags(db, deck_id, metadata["tags"])
            
        from app.modules.deck.models import Flashcard
        existing_c_res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        existing_c_map = {c.id: c for c in existing_c_res.scalars().all()}
        
        for c_data in cards:
            c_id = c_data.get("id")
            
            if c_id and c_id in existing_c_map:
                db_c = existing_c_map[c_id]
                db_c.content = c_data["content"]
                db_c.explanation = c_data["explanation"]
                db_c.ai_explanation = c_data.get("ai_explanation")
                db_c.image = c_data.get("image")
                db_c.audio = c_data.get("audio")
                db_c.others = c_data.get("others")
            else:
                db_c = Flashcard(
                    deck_id=deck_id,
                    content=c_data["content"],
                    explanation=c_data["explanation"],
                    ai_explanation=c_data.get("ai_explanation"),
                    image=c_data.get("image"),
                    audio=c_data.get("audio"),
                    question_type=c_data.get("question_type", "flashcard"),
                    others=c_data.get("others")
                )
                db.add(db_c)
                
        await db.commit()
        return {"status": "ok", "message": "Deck updated successfully."}
        
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/generate-audio/{card_id}")
async def generate_card_audio(card_id: int, request: Request, face: str = "front", db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    from app.modules.deck.services.audio_generator import AudioGenerator
    
    # Select text based on face - strictly require front_audio_content / back_audio_content
    text = ""
    if face == "front":
        text = c.others.get("front_audio_content") if c.others else None
    else:
        text = c.others.get("back_audio_content") if c.others else None
            
    if not text or not text.strip():
        return JSONResponse(status_code=400, content={"error": "Audio reading script is empty. Cannot generate audio."})
        
    # Determine physical path and absolute URL based on requested deck_id and card_id
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(c.deck_id), "audio")
    filename = f"{c.id}_front.mp3" if face == "front" else f"{c.id}_back.mp3"
    physical_path = os.path.join(folder_path, filename)
    
    # Construct relative URL
    url = f"/uploads/{c.deck_id}/audio/{filename}"
    
    # Check if we already have it generated on disk
    if os.path.exists(physical_path):
        # File is on disk, just make sure database is synchronized
        db_updated = False
        if face == "front":
            if c.audio != url:
                c.audio = url
                db_updated = True
        else:
            if not c.others:
                c.others = {}
            if c.others.get("back_audio_url") != url:
                c.others["back_audio_url"] = url
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(c, "others")
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
        c.audio = url
    else:
        if not c.others:
            c.others = {}
        c.others["back_audio_url"] = url
        # Mark others dirty for SQLAlchemy JSON tracking
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    return {"url": url}
