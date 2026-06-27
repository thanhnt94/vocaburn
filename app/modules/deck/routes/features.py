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
    available_cols = {"front", "back"}
    cards_stmt = select(Flashcard.others).where(Flashcard.deck_id == deck_id)
    res = await db.execute(cards_stmt)
    for others_json in res.scalars():
        if others_json and isinstance(others_json, dict):
            for k in others_json.keys():
                if k not in ("id", "item_id", "order_in_container") and not k.endswith("_audio_url") and not k.endswith("_img") and k != "image" and k != "audio" and k != "other_content":
                    available_cols.add(k)
    
    creator_settings = migrate_practice_settings(deck.practice_settings)
    
    return {
        "creator_settings": creator_settings,
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
async def import_update_deck(request: Request, deck_id: int, file: UploadFile = File(...), mode: str = Form("merge"), db: AsyncSession = Depends(get_db)):
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
                
            if c_id and c_id in existing_c_map:
                db_c = existing_c_map[c_id]
                db_c.content = content
                db_c.explanation = explanation
                if "ai_explanation" in c_data:
                    db_c.ai_explanation = c_data.get("ai_explanation")
                if "image" in c_data:
                    db_c.image = c_data.get("image")
                if "audio" in c_data:
                    db_c.audio = c_data.get("audio")
                if "others" in c_data:
                    db_c.others = c_data.get("others")
            else:
                db_c = Flashcard(
                    deck_id=deck_id,
                    content=content,
                    explanation=explanation,
                    ai_explanation=c_data.get("ai_explanation"),
                    image=c_data.get("image"),
                    audio=c_data.get("audio"),
                    question_type=c_data.get("question_type", "flashcard"),
                    others=c_data.get("others") or {}
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
        text = c.others.get("front_audio_content") if c.others else None
    else:
        text = c.others.get("back_audio_content") if c.others else None
            
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
            if not c.others:
                c.others = {}
            if c.others.get("back_audio_url") != url:
                c.others["back_audio_url"] = url
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(c, "others")
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
                    audio_url = f"{sso_config.server_url.rstrip('/')}{data['url']}"
                    audio_res = await client.get(audio_url, timeout=20.0)
                    if audio_res.status_code == 200:
                        os.makedirs(os.path.dirname(physical_path), exist_ok=True)
                        with open(physical_path, "wb") as f:
                            f.write(audio_res.content)
                        success = True
                        logger.info(f"[TTS CENTRAL] Centralized TTS audio downloaded and saved successfully to {physical_path}")
                    else:
                        logger.error(f"[TTS CENTRAL ERROR] Failed to download synthesized file from {audio_url}: {audio_res.status_code}")
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
        if not c.others:
            c.others = {}
        c.others["back_audio_url"] = url
        # Mark others dirty for SQLAlchemy JSON tracking
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
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

async def _bulk_generate_deck_audio_task(deck_id: int, force: bool):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        logger.info(f"[BULK TTS] Starting batch submission to CentralAuth queue for deck {deck_id} ({len(cards)} cards)")
        
        # Get CentralAuth configuration
        from app.modules.sso_module.service import SSOService
        sso_config = await SSOService.get_config(db)
        if not sso_config.is_enabled or not sso_config.server_url:
            logger.error("[BULK TTS ERROR] CentralAuth is not enabled or server URL is not configured.")
            return

        import httpx
        from app.core.config import settings
        
        tasks_to_submit = []
        callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else "http://localhost:5000"
        callback_url = f"{callback_base.rstrip('/')}/api/v1/deck/tts-callback"

        for c in cards:
            await db.refresh(c)
            front_text = c.others.get("front_audio_content") if c.others else None
            back_text = c.others.get("back_audio_content") if c.others else None
            
            folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(deck_id), "audio")
            
            # Front text queue check
            if front_text and front_text.strip():
                front_path = os.path.join(folder_path, f"{c.id}_front.mp3")
                if force or not os.path.exists(front_path) or not c.audio:
                    tasks_to_submit.append({
                        "satellite_source": "vocaburn",
                        "prompt": front_text.strip(),
                        "callback_url": callback_url,
                        "extra_data": json.dumps({
                            "task_type": "tts",
                            "card_id": c.id,
                            "face": "front",
                            "deck_id": deck_id
                        }),
                        "max_retries": 3
                    })

            # Back text queue check
            if back_text and back_text.strip():
                back_path = os.path.join(folder_path, f"{c.id}_back.mp3")
                has_back_audio = bool(c.others and c.others.get("back_audio_url"))
                if force or not os.path.exists(back_path) or not has_back_audio:
                    tasks_to_submit.append({
                        "satellite_source": "vocaburn",
                        "prompt": back_text.strip(),
                        "callback_url": callback_url,
                        "extra_data": json.dumps({
                            "task_type": "tts",
                            "card_id": c.id,
                            "face": "back",
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
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    force = False
    if payload:
        force = payload.get("force", False)
        
    background_tasks.add_task(_bulk_generate_deck_audio_task, deck_id, force)
    return {"status": "ok", "message": "Bulk TTS audio generation queue submission started."}

@router.get("/{deck_id}/tts-status")
async def get_deck_tts_status(deck_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    
    total = len(cards)
    missing = 0
    for c in cards:
        has_front = bool(c.audio and c.audio.strip())
        has_back = bool(c.others and c.others.get("back_audio_url") and c.others.get("back_audio_url").strip())
        if not has_front or not has_back:
            missing += 1
            
    return {
        "total_cards": total,
        "missing_audio_cards": missing
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
        deck_id = extra.get("deck_id")
    except Exception as parse_err:
        logger.error(f"[TTS CALLBACK ERROR] Failed to parse extra_data: {parse_err}")
        return JSONResponse(status_code=400, content={"error": "Invalid extra_data"})
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        logger.error(f"[TTS CALLBACK ERROR] Card {card_id} not found in database.")
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    # Download audio from CentralAuth
    from app.modules.sso_module.service import SSOService
    sso_config = await SSOService.get_config(db)
    if not sso_config.server_url:
        return JSONResponse(status_code=400, content={"error": "CentralAuth not configured"})
        
    audio_url = f"{sso_config.server_url.rstrip('/')}{result}"
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(deck_id), "audio")
    filename = f"{card_id}_front.mp3" if face == "front" else f"{card_id}_back.mp3"
    physical_path = os.path.join(folder_path, filename)
    
    os.makedirs(os.path.dirname(physical_path), exist_ok=True)
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            audio_res = await client.get(audio_url, timeout=20.0)
            if audio_res.status_code == 200:
                with open(physical_path, "wb") as f:
                    f.write(audio_res.content)
            else:
                logger.error(f"[TTS CALLBACK ERROR] Failed to download {audio_url}: {audio_res.status_code}")
                return JSONResponse(status_code=500, content={"error": "Failed to download audio file"})
    except Exception as dl_err:
        logger.error(f"[TTS CALLBACK ERROR] Exception during audio download: {dl_err}")
        return JSONResponse(status_code=500, content={"error": str(dl_err)})
        
    # Update local url reference
    local_url = f"/uploads/{deck_id}/audio/{filename}"
    if face == "front":
        c.audio = local_url
    else:
        if not c.others:
            c.others = {}
        c.others["back_audio_url"] = local_url
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[TTS CALLBACK SUCCESS] Updated card {card_id} {face} audio via CentralAuth Queue Callback.")
    return {"status": "ok"}
