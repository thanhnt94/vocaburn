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

def migrate_practice_settings(settings: Optional[dict]) -> dict:
    if not settings:
        return {}
    if any(k in settings for k in ("mcq", "typing", "listening")):
        return settings
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    res = {
        "mcq": {"active_pairs": active_pairs, "num_choices": num_choices},
        "typing": {"active_pairs": active_pairs},
        "listening": {"active_pairs": active_pairs, "num_choices": num_choices}
    }
    for k, v in settings.items():
        if k not in ("active_pairs", "num_choices"):
            res[k] = v
    return res

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
    available_cols = {
        "front", "back", 
        "front_audio_content", "back_audio_content", 
        "front_audio_url", "back_audio_url", 
        "front_img", "back_img"
    }
    cards_stmt = select(Flashcard.others).where(Flashcard.deck_id == deck_id)
    res = await db.execute(cards_stmt)
    for others_json in res.scalars():
        if others_json and isinstance(others_json, dict):
            for k in others_json.keys():
                if k not in ("id", "item_id", "order_in_container") and k != "other_content":
                    available_cols.add(k)
    
    # Also add custom columns from practice_settings
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        for col in deck.practice_settings.get("custom_columns", []):
            available_cols.add(col)
            
    creator_settings = migrate_practice_settings(deck.practice_settings)
    
    return {
        "creator_settings": creator_settings,
        "user_settings": migrate_practice_settings(user_sett.settings) if user_sett else None,
        "available_columns": sorted(list(available_cols)),
        "deck_name": deck.title
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
        from app.modules.auth.models import User as UserDB
        is_owner = deck.creator_id == user_id
        collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        # Also check admin role (matching PATCH /{deck_id} permission logic)
        user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
        user_obj = user_res.scalar_one_or_none()
        is_admin = user_obj and user_obj.role == "admin"
        
        if not (is_owner or is_collaborator or user_id == 1 or is_admin):
            return JSONResponse(status_code=403, content={"error": "No permission to save deck default settings"})
            
        from sqlalchemy.orm.attributes import flag_modified
        if not deck.practice_settings or not settings:
            deck.practice_settings = settings
        else:
            merged = {}
            if isinstance(deck.practice_settings, dict):
                merged.update(deck.practice_settings)
            if isinstance(settings, dict):
                merged.update(settings)
            deck.practice_settings = merged
        flag_modified(deck, "practice_settings")
    else:
        # Save user settings
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none()
        from sqlalchemy.orm.attributes import flag_modified
        if not user_sett:
            user_sett = UserDeckSettings(user_id=user_id, deck_id=deck_id, settings=settings)
            db.add(user_sett)
        elif not settings:
            user_sett.settings = {}
            flag_modified(user_sett, "settings")
        else:
            merged = {}
            if isinstance(user_sett.settings, dict):
                merged.update(user_sett.settings)
            if isinstance(settings, dict):
                merged.update(settings)
            user_sett.settings = merged
            flag_modified(user_sett, "settings")
            
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

@router.post("/question/{card_id}/star")
@router.post("/flashcard/{card_id}/star")
@router.post("/card/{card_id}/star")
async def toggle_card_star(request: Request, card_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import UserCardMastery
    user_id = int(request.cookies.get("user_id", 1))
    is_starred = data.get("is_starred", True)
    
    result = await db.execute(
        select(UserCardMastery).where(UserCardMastery.user_id == user_id, UserCardMastery.card_id == card_id)
    )
    mastery = result.scalar_one_or_none()
    
    if mastery:
        mastery.is_starred = is_starred
    else:
        mastery = UserCardMastery(user_id=user_id, card_id=card_id, is_starred=is_starred)
        db.add(mastery)
        
    await db.commit()
    return {"status": "ok", "is_starred": is_starred}

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

@router.post("/{deck_id}/import-analyze")
async def import_analyze_deck(request: Request, deck_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
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
            return JSONResponse(status_code=403, content={"error": "No permission to view this deck"})
            
        content = await file.read()
        import asyncio
        metadata, cards = await asyncio.to_thread(ExcelDeckService.parse_deck_excel, content)
        
        if not cards:
            return JSONResponse(status_code=400, content={"error": "No valid cards found in Excel file."})
            
        from app.modules.deck.models import Flashcard
        existing_c_res = await db.execute(select(Flashcard.id).filter(Flashcard.deck_id == deck_id))
        existing_ids = {r[0] for r in existing_c_res.all()}
        
        updated_count = 0
        added_count = 0
        
        for c_data in cards:
            c_id = c_data.get("id")
            if c_id and c_id in existing_ids:
                updated_count += 1
            else:
                added_count += 1
                
        return {
            "status": "ok",
            "title": metadata.get("title", deck.title),
            "description": metadata.get("description", deck.description),
            "total_excel_rows": len(cards),
            "updated_count": updated_count,
            "added_count": added_count
        }
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel analysis error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/{deck_id}/import-update")
async def import_update_deck(request: Request, deck_id: int, file: UploadFile = File(...), mode: str = Form("merge"), db: AsyncSession = Depends(get_db)):
    try:
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
            others = dict(c_data.get("others") or {})
            
            # Map standard keys in others to physical columns on Flashcard
            front_audio_content = others.pop("front_audio_content", None)
            back_audio_content = others.pop("back_audio_content", None)
            front_audio_url = others.pop("front_audio_url", None) or c_data.get("audio")
            back_audio_url = others.pop("back_audio_url", None)
            front_img = others.pop("front_img", None) or c_data.get("image")
            back_img = others.pop("back_img", None)
            
            if c_id and c_id in existing_c_map:
                db_c = existing_c_map[c_id]
                db_c.content = c_data["content"]
                db_c.explanation = c_data["explanation"]
                db_c.front_audio_content = front_audio_content
                db_c.back_audio_content = back_audio_content
                db_c.front_audio_url = front_audio_url
                db_c.back_audio_url = back_audio_url
                db_c.front_img = front_img
                db_c.back_img = back_img
                db_c.others = others
            else:
                db_c = Flashcard(
                    deck_id=deck_id,
                    content=c_data["content"],
                    explanation=c_data["explanation"],
                    front_audio_content=front_audio_content,
                    back_audio_content=back_audio_content,
                    front_audio_url=front_audio_url,
                    back_audio_url=back_audio_url,
                    front_img=front_img,
                    back_img=back_img,
                    question_type=c_data.get("question_type", "flashcard"),
                    others=others
                )
                db.add(db_c)
                
        await db.commit()
        return {"status": "ok", "message": "Deck updated successfully."}
        
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/{deck_id}/import-text-update")
async def import_text_update(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        deck = await DeckService.get_deck_by_id(db, deck_id)
        if not deck:
            return JSONResponse(status_code=404, content={"error": "Deck not found"})
            
        from app.modules.deck.models import DeckCollaborator
        is_owner = deck.creator_id == user_id
        collab_res = await db.execute(select(DeckCollaborator).where(DeckCollaborator.deck_id == deck_id, DeckCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        # Check admin role
        from app.modules.auth.models import User as UserDB
        user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
        user_obj = user_res.scalar_one_or_none()
        is_admin = user_obj and user_obj.role == "admin"
        
        if not (is_owner or is_collaborator or user_id == 1 or is_admin):
            return JSONResponse(status_code=403, content={"error": "No permission to update this deck"})
            
        cards = data.get("cards", [])
        mode = data.get("mode", "merge")
        
        if not cards:
            return JSONResponse(status_code=400, content={"error": "No valid cards provided."})
            
        from app.modules.deck.models import Flashcard
        
        if mode == "overwrite":
            # Delete existing cards and their stats/answers completely
            card_ids_res = await db.execute(select(Flashcard.id).filter(Flashcard.deck_id == deck_id))
            card_ids = [r[0] for r in card_ids_res.all()]
            if card_ids:
                from app.modules.deck.models import UserCardMastery, UserPracticeStats, UserCardNote, UserAnswer
                await db.execute(delete(UserCardMastery).where(UserCardMastery.card_id.in_(card_ids)))
                await db.execute(delete(UserPracticeStats).where(UserPracticeStats.card_id.in_(card_ids)))
                await db.execute(delete(UserCardNote).where(UserCardNote.card_id.in_(card_ids)))
                await db.execute(delete(UserAnswer).where(UserAnswer.card_id.in_(card_ids)))
                await db.execute(delete(Flashcard).where(Flashcard.id.in_(card_ids)))
            existing_c_map = {}
        else:
            existing_c_res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
            existing_c_map = {c.id: c for c in existing_c_res.scalars().all()}
            
        for c_data in cards:
            c_id = c_data.get("id")
            content = c_data.get("content", "").strip()
            explanation = c_data.get("explanation", "").strip()
            
            # Skip completely empty rows
            if not content and not explanation:
                continue
                
            others = dict(c_data.get("others") or {})
            
            # Map standard keys in others to physical columns on Flashcard
            front_audio_content = others.pop("front_audio_content", None)
            back_audio_content = others.pop("back_audio_content", None)
            front_audio_url = others.pop("front_audio_url", None)
            back_audio_url = others.pop("back_audio_url", None)
            front_img = others.pop("front_img", None)
            back_img = others.pop("back_img", None)
            
            if c_id and c_id in existing_c_map:
                db_c = existing_c_map[c_id]
                db_c.content = content
                db_c.explanation = explanation
                db_c.front_audio_content = front_audio_content
                db_c.back_audio_content = back_audio_content
                db_c.front_audio_url = front_audio_url
                db_c.back_audio_url = back_audio_url
                db_c.front_img = front_img
                db_c.back_img = back_img
                db_c.others = others
            else:
                db_c = Flashcard(
                    deck_id=deck_id,
                    content=content,
                    explanation=explanation,
                    front_audio_content=front_audio_content,
                    back_audio_content=back_audio_content,
                    front_audio_url=front_audio_url,
                    back_audio_url=back_audio_url,
                    front_img=front_img,
                    back_img=back_img,
                    question_type=c_data.get("question_type", "flashcard"),
                    others=others
                )
                db.add(db_c)
                
        await db.commit()
        return {"status": "ok", "message": "Deck updated successfully."}
    except Exception as e:
        import traceback
        print(f"CRITICAL: Text update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

async def generate_single_card_audio_helper(c, face: str, force: bool, db: AsyncSession) -> Optional[str]:
    # Select text based on face - strictly require front_audio_content / back_audio_content
    text = ""
    if face == "front":
        text = c.front_audio_content or (c.others.get("front_audio_content") if c.others else None)
    else:
        text = c.back_audio_content or (c.others.get("back_audio_content") if c.others else None)
            
    if not text or not text.strip():
        return None
        
    # Determine physical path and absolute URL based on requested deck_id and card_id
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(c.deck_id), "audio")
    filename = f"{c.id}_front.mp3" if face == "front" else f"{c.id}_back.mp3"
    physical_path = os.path.join(folder_path, filename)
    
    # Construct relative URL
    url = f"/uploads/{c.deck_id}/audio/{filename}"
    
    # Check if we already have it generated on disk (skip if force=True)
    if os.path.exists(physical_path) and not force:
        # File is on disk, just make sure database is synchronized
        db_updated = False
        if face == "front":
            if c.audio != url:
                c.audio = url
                db_updated = True
        else:
            if c.back_audio_url != url:
                c.back_audio_url = url
                db_updated = True
        if db_updated:
            await db.commit()
        return url
    
    # Delete existing file if force regeneration
    if force and os.path.exists(physical_path):
        try:
            os.remove(physical_path)
        except Exception:
            pass
        
    # Generate if not exists
    success = False
    
    # Check if Central SSO is enabled and try centralized TTS
    from app.modules.sso_module.service import SSOService
    try:
        sso_config = await SSOService.get_config(db)
        if sso_config.is_enabled and sso_config.server_url:
            import httpx
            logger.info(f"[TTS CENTRAL] SSO is enabled. Requesting centralized TTS from {sso_config.server_url} for text: '{text[:30]}...'")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{sso_config.server_url.rstrip('/')}/api/tts/generate",
                    json={"text": text},
                    timeout=20.0
                )
                if response.status_code == 200:
                    data = response.json()
                    filename = data.get("filename") or os.path.basename(data.get("url"))
                    central_ref = f"central-tts://{filename}"
                    
                    # Save back to database
                    if face == "front":
                        c.audio = central_ref
                    else:
                        c.back_audio_url = central_ref
                        
                    await db.commit()
                    
                    # Return the fully resolved URL for immediate UI play/preview
                    resolved_url = f"{sso_config.server_url.rstrip('/')}/static/uploads/tts/{filename}"
                    logger.info(f"[TTS CENTRAL SUCCESS] Stored logical reference {central_ref} in card {c.id}")
                    return resolved_url
                else:
                    logger.error(f"[TTS CENTRAL ERROR] Centralized TTS endpoint returned status {response.status_code}: {response.text}")
    except Exception as sso_err:
        logger.warning(f"[TTS CENTRAL WARNING] Centralized TTS request failed, will fallback to local generation: {sso_err}")
 
    # Fallback to local generation if centralized TTS failed or wasn't active
    if not success:
        try:
            from app.modules.deck.services.audio_generator import AudioGenerator
            logger.info(f"[TTS LOCAL] Generating TTS locally using edge-tts/gTTS for text: '{text[:30]}...'")
            success = await AudioGenerator.generate_tts(text, physical_path)
        except Exception as e:
            import traceback
            logger.error(f"Failed to generate audio locally: {e}\n{traceback.format_exc()}")
            return None
            
    if not success:
        return None
        
    # Save back to database
    if face == "front":
        c.audio = url
    else:
        c.back_audio_url = url
        
    await db.commit()
    return url

@router.get("/generate-audio/{card_id}")
async def generate_card_audio(card_id: int, request: Request, face: str = "front", force: bool = False, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    url = await generate_single_card_audio_helper(c, face, force, db)
    if not url:
        return JSONResponse(status_code=500, content={"error": "Failed to generate audio"})
        
    return {"url": url}

async def _bulk_generate_deck_audio_task(
    deck_id: int, 
    source_field: str, 
    target_field: str, 
    force: bool, 
    base_url: str,
    card_ids: list = None
):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]
        logger.info(f"[BULK TTS] Starting batch submission to CentralAuth queue for deck {deck_id} ({len(cards)} cards) Source={source_field} Target={target_field}")
        
        # Get CentralAuth configuration
        from app.modules.sso_module.service import SSOService
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            logger.error("[BULK TTS ERROR] CentralAuth is not enabled or server URL is not configured.")
            return

        import httpx
        from app.core.config import settings
        
        tasks_to_submit = []
        callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else base_url
        callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/tts-callback"

        for c in cards:
            await db.refresh(c)
            
            # Determine prompt text
            if source_field == "front":
                text = c.content
            elif source_field == "back":
                text = c.explanation
            elif source_field == "front_audio_content":
                text = c.front_audio_content
            elif source_field == "back_audio_content":
                text = c.back_audio_content
            else:
                text = c.others.get(source_field) if c.others else None
                
            if not text or not str(text).strip():
                continue
                
            text = str(text).strip()
            
            # Check target field
            has_audio = False
            if target_field == "front_audio_url":
                has_audio = bool(c.front_audio_url and c.front_audio_url.strip())
            elif target_field == "back_audio_url":
                has_audio = bool(c.back_audio_url and c.back_audio_url.strip())
            else:
                has_audio = bool(c.others and c.others.get(target_field))
                
            if force or not has_audio:
                tasks_to_submit.append({
                    "satellite_source": "vocaburn",
                    "prompt": text,
                    "callback_url": callback_url,
                    "extra_data": json.dumps({
                        "task_type": "tts",
                        "card_id": c.id,
                        "face": target_field,
                        "deck_id": deck_id
                    }),
                    "max_retries": 3
                })

        if not tasks_to_submit:
            logger.info(f"[BULK TTS] All cards in deck {deck_id} are already fully synchronized.")
            return

        logger.info(f"[BULK TTS] Submitting {len(tasks_to_submit)} queue tasks to CentralAuth in chunks of 100...")
        queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
        chunk_size = 100

        async with httpx.AsyncClient() as client:
            for i in range(0, len(tasks_to_submit), chunk_size):
                chunk = tasks_to_submit[i:i + chunk_size]
                try:
                    response = await client.post(
                        f"{sso_config.server_url.rstrip('/')}/api/queue/submit/batch",
                        json={"tasks": chunk},
                        headers={"X-Queue-Token": queue_token},
                        timeout=30.0
                    )
                    if response.status_code != 200:
                        logger.error(f"[BULK TTS SUBMIT ERROR] Chunk {i//chunk_size} failed: {response.text}")
                    else:
                        logger.info(f"[BULK TTS SUBMIT] Successfully submitted chunk {i//chunk_size} ({len(chunk)} tasks)")
                except Exception as batch_err:
                    logger.error(f"[BULK TTS SUBMIT EXCEPTION] Exception in chunk {i//chunk_size}: {batch_err}")

@router.post("/{deck_id}/generate-all-audio")
async def generate_all_deck_audio(
    deck_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    force = False
    source_field = "front"
    target_field = "front_audio_url"
    card_ids = None
    
    if payload:
        force = payload.get("force", False)
        source_field = payload.get("source_field", "front")
        target_field = payload.get("target_field", "front_audio_url")
        card_ids = payload.get("card_ids", None)
        
    # Detect scheme dynamically (e.g. support HTTPS behind Nginx reverse proxy)
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    
    # Force HTTPS for any production domain to bypass Nginx configuration gaps
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
        
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_audio_task, deck_id, source_field, target_field, force, base_url, card_ids)
    return {"status": "ok", "message": "Bulk TTS audio generation queue submission started."}

@router.get("/{deck_id}/tts-status")
async def get_deck_tts_status(
    deck_id: int, 
    source_field: str = "front", 
    target_field: str = "front_audio_url", 
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    cards_list = []
    
    for c in cards:
        # Determine text
        if source_field == "front":
            text = c.content
        elif source_field == "back":
            text = c.explanation
        elif source_field == "front_audio_content":
            text = c.front_audio_content
        elif source_field == "back_audio_content":
            text = c.back_audio_content
        else:
            text = c.others.get(source_field) if c.others else None
            
        if not text or not str(text).strip():
            continue
            
        # Check target field
        has_audio = False
        if target_field == "front_audio_url":
            has_audio = bool(c.front_audio_url and c.front_audio_url.strip())
        elif target_field == "back_audio_url":
            has_audio = bool(c.back_audio_url and c.back_audio_url.strip())
        else:
            has_audio = bool(c.others and c.others.get(target_field))
            
        if not has_audio:
            missing += 1
            
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "missing": not has_audio
        })
            
    return {
        "total_cards": total,
        "missing_audio_cards": missing,
        "cards": cards_list
    }

@router.post("/tts-callback")
async def tts_queue_callback(data: dict, db: AsyncSession = Depends(get_db)):
    task_id = data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[TTS CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if extra_data_str else {}
        if extra.get("task_type") != "tts":
            return {"status": "ignored"}
            
        card_id = extra.get("card_id")
        face = extra.get("face")
    except Exception as parse_err:
        logger.error(f"[TTS CALLBACK ERROR] Failed to parse extra_data: {parse_err}")
        return JSONResponse(status_code=400, content={"error": "Invalid extra_data"})
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        logger.error(f"[TTS CALLBACK ERROR] Card {card_id} not found in database.")
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    # Instead of downloading, we store the logical path reference
    filename = os.path.basename(result)
    central_ref = f"central-tts://{filename}"
    
    target_attr = face
    if face == "front":
        target_attr = "front_audio_url"
    elif face == "back":
        target_attr = "back_audio_url"
        
    physical_map = {
        "front_audio_url": "front_audio_url",
        "back_audio_url": "back_audio_url"
    }
    
    if target_attr in physical_map:
        setattr(c, physical_map[target_attr], central_ref)
    else:
        if not c.others:
            c.others = {}
        c.others[target_attr] = central_ref
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[TTS CALLBACK SUCCESS] Updated card {card_id} field '{target_attr}' with central reference {central_ref}.")
    return {"status": "ok"}

@router.post("/image-callback")
async def image_queue_callback(data: dict, db: AsyncSession = Depends(get_db)):
    task_id = data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[IMAGE CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if extra_data_str else {}
        if extra.get("task_type") != "image":
            return {"status": "ignored"}
            
        card_id = extra.get("card_id")
        target_field = extra.get("target_field", "front_img")
    except Exception as parse_err:
        logger.error(f"[IMAGE CALLBACK ERROR] Failed to parse extra_data: {parse_err}")
        return JSONResponse(status_code=400, content={"error": "Invalid extra_data"})
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        logger.error(f"[IMAGE CALLBACK ERROR] Card {card_id} not found in database.")
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    # Instead of downloading, we store the logical path reference
    filename = os.path.basename(result)
    central_ref = f"central-media://{filename}"
    
    physical_map = {
        "front_img": "front_img",
        "back_img": "back_img"
    }
    
    if target_field in physical_map:
        setattr(c, physical_map[target_field], central_ref)
    else:
        if not c.others:
            c.others = {}
        c.others[target_field] = central_ref
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[IMAGE CALLBACK SUCCESS] Updated card {card_id} field '{target_field}' with central reference {central_ref}.")
    return {"status": "ok"}

@router.post("/furigana-callback")
async def furigana_queue_callback(data: dict, db: AsyncSession = Depends(get_db)):
    task_id = data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[FURIGANA CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if extra_data_str else {}
        if extra.get("task_type") != "furigana":
            return {"status": "ignored"}
            
        card_id = extra.get("card_id")
        target_field = extra.get("target_field", "front")
    except Exception as parse_err:
        logger.error(f"[FURIGANA CALLBACK ERROR] Failed to parse extra_data: {parse_err}")
        return JSONResponse(status_code=400, content={"error": "Invalid extra_data"})
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        logger.error(f"[FURIGANA CALLBACK ERROR] Card {card_id} not found in database.")
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    physical_map = {
        "front": "content",
        "back": "explanation",
    }
    
    if target_field in physical_map:
        setattr(c, physical_map[target_field], result)
    else:
        if not c.others:
            c.others = {}
        c.others[target_field] = result
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[FURIGANA CALLBACK SUCCESS] Updated card {card_id} field '{target_field}' with furigana text.")
    return {"status": "ok"}

@router.post("/ai-callback")
async def ai_queue_callback(data: dict, db: AsyncSession = Depends(get_db)):
    task_id = data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[AI CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if extra_data_str else {}
        if extra.get("task_type") != "ai-explain":
            return {"status": "ignored"}
            
        card_id = extra.get("card_id")
        field = extra.get("field", "explanation")
    except Exception as parse_err:
        logger.error(f"[AI CALLBACK ERROR] Failed to parse extra_data: {parse_err}")
        return JSONResponse(status_code=400, content={"error": "Invalid extra_data"})
        
    from app.modules.deck.models import Flashcard
    from sqlalchemy.orm.attributes import flag_modified
    import re
    
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        logger.error(f"[AI CALLBACK ERROR] Card {card_id} not found in database.")
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    content = result.strip()
    if content.startswith("```markdown"):
        content = content[len("```markdown"):].strip()
    elif content.startswith("```"):
        content = content[len("```"):].strip()
    if content.endswith("```"):
        content = content[:-3].strip()
    content = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', content)

    physical_map = {
        "front": "content",
        "back": "explanation",
        "front_audio_content": "front_audio_content",
        "back_audio_content": "back_audio_content",
        "front_audio_url": "front_audio_url",
        "back_audio_url": "back_audio_url",
        "front_img": "front_img",
        "back_img": "back_img"
    }

    if field in physical_map:
        setattr(c, physical_map[field], content)
    else:
        if not c.others:
            c.others = {}
        c.others[field] = content
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[AI CALLBACK SUCCESS] Updated card {card_id} field '{field}' via CentralAuth Queue Callback.")
    return {"status": "ok"}

def _resolve_prompt_placeholders(template: str, card, deck, options_text: str, correct_answer_text: str) -> str:
    prompt = template
    
    # 1. Standard replacements
    prompt = prompt.replace("{{card}}", card.content or "")
    prompt = prompt.replace("{{question}}", card.content or "")
    prompt = prompt.replace("{{front}}", card.content or "")
    prompt = prompt.replace("{{back}}", card.explanation or "")
    prompt = prompt.replace("{{explanation}}", card.explanation or "")
    prompt = prompt.replace("{{correct_answer}}", correct_answer_text)
    prompt = prompt.replace("{{options}}", options_text)
    prompt = prompt.replace("{{global_instruction}}", (deck.instruction if deck else "") or "")
    prompt = prompt.replace("{{quiz_title}}", (deck.title if deck else "") or "")
    prompt = prompt.replace("{{deck_title}}", (deck.title if deck else "") or "")
    prompt = prompt.replace("{{quiz_description}}", (deck.description if deck else "") or "")
    prompt = prompt.replace("{{deck_description}}", (deck.description if deck else "") or "")
    
    # 2. Custom fields in card.others
    if card.others and isinstance(card.others, dict):
        for k, v in card.others.items():
            if v is not None:
                prompt = prompt.replace(f"{{{{{k}}}}}", str(v))
                prompt = prompt.replace(f"{{{{{k.lower()}}}}}", str(v))
                
    # 3. Model attribute fallbacks
    prompt = prompt.replace("{{front_audio_content}}", getattr(card, "front_audio_content", "") or "")
    prompt = prompt.replace("{{back_audio_content}}", getattr(card, "back_audio_content", "") or "")
    prompt = prompt.replace("{{front_audio_url}}", getattr(card, "front_audio_url", "") or "")
    prompt = prompt.replace("{{back_audio_url}}", getattr(card, "back_audio_url", "") or "")
    prompt = prompt.replace("{{front_img}}", getattr(card, "front_img", "") or "")
    prompt = prompt.replace("{{back_img}}", getattr(card, "back_img", "") or "")
    
    # Replace any option placeholders
    for i in range(4):
        prompt = prompt.replace(f"{{{{option_{chr(97+i)}}}}}", "")
        
    return prompt

async def _bulk_generate_deck_ai_task(deck_id: int, field: str, force: bool, base_url: str, card_ids: list = None):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard, FlashcardDeck
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]
        
        # Get deck prompt templates
        deck_res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
        deck = deck_res.scalar_one_or_none()
        if not deck:
            return
            
        template = None
        if deck.practice_settings and isinstance(deck.practice_settings, dict):
            prompts = deck.practice_settings.get("ai_prompts", [])
            for p in prompts:
                if p.get("column") == field or p.get("id") == field:
                    template = p.get("prompt")
                    break
                        
        if not template or not template.strip():
            logger.error(f"[BULK AI ERROR] No prompt template found for field '{field}' in deck {deck_id}")
            return

        # Get CentralAuth configuration
        from app.modules.sso_module.service import SSOService
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            logger.error("[BULK AI ERROR] CentralAuth is not enabled or server URL is not configured.")
            return

        import httpx
        from app.core.config import settings
        
        tasks_to_submit = []
        callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else base_url
        callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/ai-callback"
        
        physical_map = {
            "front": "content",
            "back": "explanation",
            "front_audio_content": "front_audio_content",
            "back_audio_content": "back_audio_content",
            "front_audio_url": "front_audio_url",
            "back_audio_url": "back_audio_url",
            "front_img": "front_img",
            "back_img": "back_img"
        }
        
        for c in cards:
            await db.refresh(c)
            
            # Check if already generated
            has_val = False
            if field in physical_map:
                val = getattr(c, physical_map[field])
                has_val = bool(val and val.strip())
            else:
                has_val = bool(c.others and c.others.get(field))
                
            if force or not has_val:
                options_text = ""
                card_options = getattr(c, "options", None)
                if card_options:
                    options_text = ", ".join([o.content for o in card_options])
                    
                correct_answer_text = c.explanation or ""
                if card_options:
                    correct_opt = next((o for o in card_options if o.is_correct), None)
                    if correct_opt:
                        correct_answer_text = correct_opt.content
                        
                prompt = _resolve_prompt_placeholders(template, c, deck, options_text, correct_answer_text)

                tasks_to_submit.append({
                    "satellite_source": "vocaburn",
                    "prompt": prompt,
                    "callback_url": callback_url,
                    "extra_data": json.dumps({
                        "task_type": "ai-explain",
                        "card_id": c.id,
                        "field": field,
                        "deck_id": deck_id
                    }),
                    "max_retries": 3
                })

        if not tasks_to_submit:
            logger.info(f"[BULK AI] All cards in deck {deck_id} are already fully synchronized for field '{field}'.")
            return

        logger.info(f"[BULK AI] Submitting {len(tasks_to_submit)} queue tasks to CentralAuth in chunks of 100...")
        queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
        chunk_size = 100

        async with httpx.AsyncClient() as client:
            for i in range(0, len(tasks_to_submit), chunk_size):
                chunk = tasks_to_submit[i:i + chunk_size]
                try:
                    import sqlalchemy as sa
                    response = await client.post(
                        f"{sso_config.server_url.rstrip('/')}/api/queue/submit/batch",
                        json={"tasks": chunk},
                        headers={"X-Queue-Token": queue_token},
                        timeout=30.0
                    )
                    if response.status_code != 200:
                        logger.error(f"[BULK AI SUBMIT ERROR] Chunk {i//chunk_size} failed: {response.text}")
                    else:
                        logger.info(f"[BULK AI SUBMIT] Successfully submitted chunk {i//chunk_size} ({len(chunk)} tasks)")
                except Exception as batch_err:
                    logger.error(f"[BULK AI SUBMIT EXCEPTION] Exception in chunk {i//chunk_size}: {batch_err}")

@router.get("/{deck_id}/ai-status")
async def get_deck_ai_status(deck_id: int, field: str = "explanation", db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    cards_list = []
    
    physical_map = {
        "front": "content",
        "back": "explanation",
        "front_audio_content": "front_audio_content",
        "back_audio_content": "back_audio_content",
        "front_audio_url": "front_audio_url",
        "back_audio_url": "back_audio_url",
        "front_img": "front_img",
        "back_img": "back_img"
    }

    for c in cards:
        has_val = False
        if field in physical_map:
            val = getattr(c, physical_map[field])
            has_val = bool(val and val.strip())
        else:
            has_val = bool(c.others and c.others.get(field))
            
        if not has_val:
            missing += 1
            
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "missing": not has_val
        })
            
    return {
        "total_cards": total,
        "missing_ai_cards": missing,
        "cards": cards_list
    }

@router.post("/{deck_id}/generate-all-ai")
async def generate_all_deck_ai(
    deck_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    field = "explanation"
    force = False
    card_ids = None
    if payload:
        field = payload.get("field", "explanation")
        force = payload.get("force", False)
        card_ids = payload.get("card_ids", None)
        
    # Detect scheme dynamically (e.g. support HTTPS behind Nginx reverse proxy)
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    
    # Force HTTPS for any production domain to bypass Nginx configuration gaps
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
        
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_ai_task, deck_id, field, force, base_url, card_ids)
    return {"status": "ok", "message": f"Bulk AI {field} generation queue submission started."}

@router.post("/{deck_id}/cards/{card_id}/generate-ai")
async def generate_single_card_ai(
    deck_id: int,
    card_id: int,
    request: Request,
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck, Flashcard
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    card_res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    card = card_res.scalar_one_or_none()
    if not card:
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    field = payload.get("field")
    if not field:
        return JSONResponse(status_code=400, content={"error": "Field is required"})
        
    template = None
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        prompts = deck.practice_settings.get("ai_prompts", [])
        for p in prompts:
            if p.get("column") == field or p.get("id") == field:
                template = p.get("prompt")
                break
                
    if not template or not template.strip():
        return JSONResponse(status_code=400, content={"error": f"No prompt template found for column '{field}'"})
        
    from app.modules.sso_module.service import SSOService
    sso_config = await SSOService.get_config(db)
    if not sso_config.is_enabled or not sso_config.server_url:
        return JSONResponse(status_code=500, content={"error": "CentralAuth is not enabled or server URL is not configured."})
        
    options_text = ""
    card_options = getattr(card, "options", None)
    if card_options:
        options_text = ", ".join([o.content for o in card_options])
        
    correct_answer_text = card.explanation or ""
    if card_options:
        correct_opt = next((o for o in card_options if o.is_correct), None)
        if correct_opt:
            correct_answer_text = correct_opt.content
            
    prompt = _resolve_prompt_placeholders(template, card, deck, options_text, correct_answer_text)
        
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
    base_url = f"{scheme}://{netloc}"
    
    callback_url = f"{base_url.rstrip('/')}/api/v1/deck/ai-callback"
    
    task_payload = {
        "satellite_source": "vocaburn",
        "prompt": prompt,
        "callback_url": callback_url,
        "extra_data": json.dumps({
            "task_type": "ai-explain",
            "card_id": card.id,
            "field": field,
            "deck_id": deck_id
        }),
        "max_retries": 3
    }
    
    import httpx
    from app.core.config import settings
    queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{sso_config.server_url.rstrip('/')}/api/queue/submit",
                json=task_payload,
                headers={"X-Queue-Token": queue_token},
                timeout=30.0
            )
            if response.status_code != 200:
                return JSONResponse(status_code=500, content={"error": f"Failed to submit task: {response.text}"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Exception submitting task: {str(e)}"})
            
    return {"status": "ok", "message": f"AI generation for {field} started."}

@router.post("/{deck_id}/add-column")
async def add_deck_column(deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    col_name = payload.get("column_name")
    if not col_name:
        return JSONResponse(status_code=400, content={"error": "column_name is required"})
    col_name = col_name.strip().lower().replace(" ", "_")
    if not col_name:
        return JSONResponse(status_code=400, content={"error": "Invalid column name"})
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if not deck.practice_settings or not isinstance(deck.practice_settings, dict):
        deck.practice_settings = {}
        
    custom_cols = deck.practice_settings.get("custom_columns", [])
    if col_name in custom_cols or col_name in ["front", "back", "content", "explanation"]:
        return JSONResponse(status_code=400, content={"error": "Column already exists"})
        
    custom_cols.append(col_name)
    deck.practice_settings["custom_columns"] = custom_cols
    flag_modified(deck, "practice_settings")
    
    await db.commit()
    return {"status": "ok", "column_name": col_name}

@router.post("/{deck_id}/rename-column")
async def rename_deck_column(deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    old_name = payload.get("old_name")
    new_name = payload.get("new_name")
    if not old_name or not new_name:
        return JSONResponse(status_code=400, content={"error": "old_name and new_name are required"})
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        custom_cols = deck.practice_settings.get("custom_columns", [])
        if old_name in custom_cols:
            idx = custom_cols.index(old_name)
            custom_cols[idx] = new_name
            deck.practice_settings["custom_columns"] = custom_cols
            
        prompts = deck.practice_settings.get("ai_prompts", [])
        for p in prompts:
            if p.get("column") == old_name:
                p["column"] = new_name
                p["id"] = new_name
                p["title"] = new_name.upper().replace("_", " ")
        deck.practice_settings["ai_prompts"] = prompts
        flag_modified(deck, "practice_settings")
        
    # Update all cards' others JSON keys
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).where(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    for c in cards:
        if c.others and isinstance(c.others, dict) and old_name in c.others:
            c.others[new_name] = c.others.pop(old_name)
            flag_modified(c, "others")
            
    await db.commit()
    return {"status": "ok"}

@router.post("/{deck_id}/delete-column")
async def delete_deck_column(deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    col_name = payload.get("column_name")
    if not col_name:
        return JSONResponse(status_code=400, content={"error": "column_name is required"})
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        custom_cols = deck.practice_settings.get("custom_columns", [])
        if col_name in custom_cols:
            custom_cols.remove(col_name)
            deck.practice_settings["custom_columns"] = custom_cols
            
        prompts = deck.practice_settings.get("ai_prompts", [])
        deck.practice_settings["ai_prompts"] = [p for p in prompts if p.get("column") != col_name and p.get("id") != col_name]
        flag_modified(deck, "practice_settings")
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).where(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    for c in cards:
        if c.others and isinstance(c.others, dict) and col_name in c.others:
            c.others.pop(col_name)
            flag_modified(c, "others")
            
    await db.commit()
    return {"status": "ok"}

@router.get("/{deck_id}/image-status")
async def get_deck_image_status(deck_id: int, target_field: str = "front_img", db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    cards_list = []
    
    physical_map = {
        "front_img": "front_img",
        "back_img": "back_img"
    }
    
    for c in cards:
        has_val = False
        if target_field in physical_map:
            val = getattr(c, physical_map[target_field])
            has_val = bool(val and val.strip())
        else:
            has_val = bool(c.others and c.others.get(target_field))
        if not has_val:
            missing += 1
            
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "missing": not has_val
        })
            
    return {
        "total_cards": total,
        "missing_image_cards": missing,
        "cards": cards_list
    }

@router.post("/{deck_id}/generate-all-images")
async def generate_all_deck_images(
    deck_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    source_field = "front"
    target_field = "front_img"
    force = False
    card_ids = None
    if payload:
        source_field = payload.get("source_field", "front")
        target_field = payload.get("target_field", "front_img")
        force = payload.get("force", False)
        card_ids = payload.get("card_ids", None)
        
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_images_task, deck_id, source_field, target_field, force, base_url, card_ids)
    return {"status": "ok", "message": f"Bulk image generation queue submission started."}

async def _bulk_generate_deck_images_task(deck_id: int, source_field: str, target_field: str, force: bool, base_url: str, card_ids: list = None):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]
        
        # Get CentralAuth configuration
        from app.modules.sso_module.service import SSOService
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            logger.error("[BULK IMAGE ERROR] CentralAuth is not enabled or server URL is not configured.")
            return

        import httpx
        from app.core.config import settings
        
        tasks_to_submit = []
        callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else base_url
        callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/image-callback"
        
        source_map = {
            "front": "content",
            "back": "explanation",
        }
        
        target_map = {
            "front_img": "front_img",
            "back_img": "back_img"
        }
        
        for c in cards:
            await db.refresh(c)
            
            # Check if already has image
            has_val = False
            if target_field in target_map:
                val = getattr(c, target_map[target_field])
                has_val = bool(val and val.strip())
            else:
                has_val = bool(c.others and c.others.get(target_field))
                
            if force or not has_val:
                # Get keyword text from source field
                keyword = ""
                if source_field in source_map:
                    keyword = getattr(c, source_map[source_field])
                else:
                    keyword = c.others.get(source_field) if c.others else ""
                    
                if not keyword or not keyword.strip():
                    continue
                    
                tasks_to_submit.append({
                    "satellite_source": "vocaburn",
                    "prompt": keyword.strip(),
                    "callback_url": callback_url,
                    "extra_data": json.dumps({
                        "task_type": "image",
                        "card_id": c.id,
                        "source_field": source_field,
                        "target_field": target_field,
                        "deck_id": deck_id
                    }),
                    "max_retries": 3
                })

        if not tasks_to_submit:
            logger.info(f"[BULK IMAGE] All cards in deck {deck_id} are already fully synchronized for field '{target_field}'.")
            return

        logger.info(f"[BULK IMAGE] Submitting {len(tasks_to_submit)} queue tasks to CentralAuth...")
        queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
        chunk_size = 100

        async with httpx.AsyncClient() as client:
            for i in range(0, len(tasks_to_submit), chunk_size):
                  chunk = tasks_to_submit[i:i + chunk_size]
                  try:
                      response = await client.post(
                          f"{sso_config.server_url.rstrip('/')}/api/queue/submit/batch",
                          json={"tasks": chunk},
                          headers={"X-Queue-Token": queue_token},
                          timeout=30.0
                      )
                      if response.status_code != 200:
                          logger.error(f"[BULK IMAGE SUBMIT ERROR] Chunk {i//chunk_size} failed: {response.text}")
                      else:
                          logger.info(f"[BULK IMAGE SUBMIT] Successfully submitted chunk {i//chunk_size} ({len(chunk)} tasks)")
                  except Exception as batch_err:
                      logger.error(f"[BULK IMAGE SUBMIT EXCEPTION] Exception in chunk {i//chunk_size}: {batch_err}")



@router.get("/{deck_id}/image-status")
async def get_deck_image_status(deck_id: int, target_field: str = "front_img", db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    cards_list = []
    
    physical_map = {
        "front_img": "front_img",
        "back_img": "back_img"
    }
    
    for c in cards:
        has_val = False
        if target_field in physical_map:
            val = getattr(c, physical_map[target_field])
            has_val = bool(val and val.strip())
        else:
            has_val = bool(c.others and c.others.get(target_field))
        if not has_val:
            missing += 1
            
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "missing": not has_val
        })
            
    return {
        "total_cards": total,
        "missing_image_cards": missing,
        "cards": cards_list
    }

@router.post("/{deck_id}/generate-all-images")
async def generate_all_deck_images(
    deck_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    source_field = "front"
    target_field = "front_img"
    force = False
    card_ids = None
    if payload:
        source_field = payload.get("source_field", "front")
        target_field = payload.get("target_field", "front_img")
        force = payload.get("force", False)
        card_ids = payload.get("card_ids", None)
        
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_images_task, deck_id, source_field, target_field, force, base_url, card_ids)
    return {"status": "ok", "message": f"Bulk image generation queue submission started."}

async def _bulk_generate_deck_images_task(deck_id: int, source_field: str, target_field: str, force: bool, base_url: str, card_ids: list = None):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]
        
        # Get CentralAuth configuration
        from app.modules.sso_module.service import SSOService
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            logger.error("[BULK IMAGE ERROR] CentralAuth is not enabled or server URL is not configured.")
            return

        import httpx
        from app.core.config import settings
        
        tasks_to_submit = []
        callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else base_url
        callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/image-callback"
        
        source_map = {
            "front": "content",
            "back": "explanation",
        }
        
        target_map = {
            "front_img": "front_img",
            "back_img": "back_img"
        }
        
        for c in cards:
            await db.refresh(c)
            
            # Check if already has image
            has_val = False
            if target_field in target_map:
                val = getattr(c, target_map[target_field])
                has_val = bool(val and val.strip())
            else:
                has_val = bool(c.others and c.others.get(target_field))
                
            if force or not has_val:
                # Get keyword text from source field
                keyword = ""
                if source_field in source_map:
                    keyword = getattr(c, source_map[source_field])
                else:
                    keyword = c.others.get(source_field) if c.others else ""
                    
                if not keyword or not keyword.strip():
                    continue
                    
                tasks_to_submit.append({
                    "satellite_source": "vocaburn",
                    "prompt": keyword.strip(),
                    "callback_url": callback_url,
                    "extra_data": json.dumps({
                        "task_type": "image",
                        "card_id": c.id,
                        "source_field": source_field,
                        "target_field": target_field,
                        "deck_id": deck_id
                    }),
                    "max_retries": 3
                })

        if not tasks_to_submit:
            logger.info(f"[BULK IMAGE] All cards in deck {deck_id} are already fully synchronized for field '{target_field}'.")
            return

        logger.info(f"[BULK IMAGE] Submitting {len(tasks_to_submit)} queue tasks to CentralAuth...")
        queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
        chunk_size = 100

        async with httpx.AsyncClient() as client:
            for i in range(0, len(tasks_to_submit), chunk_size):
                  chunk = tasks_to_submit[i:i + chunk_size]
                  try:
                      response = await client.post(
                          f"{sso_config.server_url.rstrip('/')}/api/queue/submit/batch",
                          json={"tasks": chunk},
                          headers={"X-Queue-Token": queue_token},
                          timeout=30.0
                      )
                      if response.status_code != 200:
                          logger.error(f"[BULK IMAGE SUBMIT ERROR] Chunk {i//chunk_size} failed: {response.text}")
                      else:
                          logger.info(f"[BULK IMAGE SUBMIT] Successfully submitted chunk {i//chunk_size} ({len(chunk)} tasks)")
                  except Exception as batch_err:
                      logger.error(f"[BULK IMAGE SUBMIT EXCEPTION] Exception in chunk {i//chunk_size}: {batch_err}")

from pydantic import BaseModel
import httpx
import re

class FuriganaRequest(BaseModel):
    text: str

@router.post("/generate-furigana")
async def generate_furigana(
    body: FuriganaRequest,
    db: AsyncSession = Depends(get_db)
):
    """Proxies Japanese Furigana generation request to CentralAuth AI service."""
    from app.modules.sso_module.service import SSOService
    try:
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            return JSONResponse(status_code=400, content={"error": "CentralAuth is not enabled or configured."})
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{sso_config.server_url.rstrip('/')}/api/chat/generate-furigana",
                json={"text": body.text},
                timeout=30.0
            )
            if response.status_code == 200:
                return response.json()
            return JSONResponse(status_code=response.status_code, content={"error": response.text})
    except Exception as e:
        logger.error(f"[FURIGANA ERROR] {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/{deck_id}/furigana-status")
async def get_deck_furigana_status(
    deck_id: int,
    source_field: str = "front",
    target_field: str = "front",
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    cards_list = []
    
    physical_map = {
        "front": "content",
        "back": "explanation",
    }
    
    kanji_pattern = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')
    
    for c in cards:
        src_val = ""
        if source_field in physical_map:
            src_val = getattr(c, physical_map[source_field]) or ""
        else:
            src_val = c.others.get(source_field) if c.others else ""
            
        tgt_val = ""
        if target_field in physical_map:
            tgt_val = getattr(c, physical_map[target_field]) or ""
        else:
            tgt_val = c.others.get(target_field) if c.others else ""
            
        has_bracket = "[" in tgt_val and "]" in tgt_val
        needs_furi = bool(src_val and kanji_pattern.search(src_val) and not has_bracket)
        
        if needs_furi:
            missing += 1
            
        cards_list.append({
            "id": c.id,
            "content": src_val[:50] + "..." if len(src_val) > 50 else src_val,
            "missing": needs_furi
        })
        
    return {
        "total_cards": total,
        "missing_furigana_cards": missing,
        "cards": cards_list
    }

async def _bulk_generate_deck_furigana_task(deck_id: int, source_field: str, target_field: str, card_ids: list, db_session_maker):
    from app.modules.deck.models import Flashcard
    from app.modules.sso_module.service import SSOService
    from app.core.config import settings
    
    async with db_session_maker() as db:
        try:
            sso_config = await SSOService.get_config(db)
            if not sso_config.is_enabled or not sso_config.server_url:
                logger.error("[BULK FURIGANA ERROR] CentralAuth is not enabled or server URL is not configured.")
                return
                
            if card_ids:
                res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id, Flashcard.id.in_(card_ids)))
            else:
                res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
            cards = res.scalars().all()
            
            tasks_to_submit = []
            callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else f"http://localhost:8000"
            callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/furigana-callback"
            
            physical_map = {
                "front": "content",
                "back": "explanation",
            }
            
            for c in cards:
                src_val = ""
                if source_field in physical_map:
                    src_val = getattr(c, physical_map[source_field]) or ""
                else:
                    src_val = c.others.get(source_field) if c.others else ""
                    
                if not src_val or not src_val.strip():
                    continue
                    
                tasks_to_submit.append({
                    "satellite_source": "vocaburn",
                    "prompt": src_val.strip(),
                    "callback_url": callback_url,
                    "extra_data": json.dumps({
                        "task_type": "furigana",
                        "card_id": c.id,
                        "source_field": source_field,
                        "target_field": target_field,
                        "deck_id": deck_id
                    }),
                    "max_retries": 3
                })

            if not tasks_to_submit:
                return

            logger.info(f"[BULK FURIGANA] Submitting {len(tasks_to_submit)} queue tasks to CentralAuth...")
            queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
            chunk_size = 100

            async with httpx.AsyncClient() as client:
                for i in range(0, len(tasks_to_submit), chunk_size):
                      chunk = tasks_to_submit[i:i + chunk_size]
                      try:
                          response = await client.post(
                              f"{sso_config.server_url.rstrip('/')}/api/queue/submit/batch",
                              json={"tasks": chunk},
                              headers={"X-Queue-Token": queue_token},
                              timeout=30.0
                          )
                          if response.status_code != 200:
                              logger.error(f"[BULK FURIGANA SUBMIT ERROR] Chunk {i//chunk_size} failed: {response.text}")
                      except Exception as batch_err:
                          logger.error(f"[BULK FURIGANA SUBMIT EXCEPTION] Exception in chunk {i//chunk_size}: {batch_err}")
                          
            logger.info(f"[BULK FURIGANA SUCCESS] Successfully submitted batch furigana generation tasks to CentralAuth.")
        except Exception as e:
            logger.error(f"[BULK FURIGANA SYSTEM ERROR] System error in batch furigana: {e}")

@router.post("/{deck_id}/generate-all-furigana")
async def generate_all_deck_furigana(
    deck_id: int,
    background_tasks: BackgroundTasks,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.core.db import AsyncSessionLocal
    
    source_field = "front"
    target_field = "front"
    card_ids = None
    if payload:
        source_field = payload.get("source_field", "front")
        target_field = payload.get("target_field", "front")
        card_ids = payload.get("card_ids", None)
        
    background_tasks.add_task(
        _bulk_generate_deck_furigana_task,
        deck_id,
        source_field,
        target_field,
        card_ids,
        AsyncSessionLocal
    )
    return {"status": "started", "message": "Batch Furigana generation task has been queued."}
