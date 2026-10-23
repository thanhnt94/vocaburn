from fastapi import APIRouter, UploadFile, File, Form, Depends, Request, BackgroundTasks, Query, HTTPException
from typing import Optional
import logging
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.deck.services.excel_service import ExcelDeckService
from app.modules.deck.services.deck_service import DeckService
from app.modules.deck.services.ai_service import ai_service
from app.modules.deck.schemas import DeckSchema, CardSchema
from app.modules.deck.models import UserDeckSettings, FlashcardDeck, Flashcard
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Deck Features"])

@router.get("/{deck_id}/export")
async def export_deck(deck_id: int, request: Request, exclude_ids: bool = False, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.modules.deck.models import FlashcardDeck
    
    stmt = select(FlashcardDeck).options(joinedload(FlashcardDeck.category), joinedload(FlashcardDeck.tags)).where(FlashcardDeck.id == deck_id)
    res = await db.execute(stmt)
    deck = res.scalars().first()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import Flashcard, DeckCollaborator
    from app.modules.auth.models import User as UserDB

    c_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
    res = await db.execute(c_stmt)
    cards = res.scalars().all()
    
    collaborators_list = []
    seen_collabs = set()
    
    # 1. Always include the creator/owner as admin
    if deck.creator_id:
        creator_res = await db.execute(select(UserDB).where(UserDB.id == deck.creator_id))
        creator_user = creator_res.scalar_one_or_none()
        if creator_user:
            uname = creator_user.username or creator_user.email
            if uname:
                collaborators_list.append({"username": uname, "role": "admin"})
                seen_collabs.add(uname.lower())
    
    # 2. Append other collaborators
    collab_stmt = select(DeckCollaborator, UserDB.username, UserDB.email).join(UserDB, DeckCollaborator.user_id == UserDB.id).where(DeckCollaborator.deck_id == deck_id)
    collab_res = await db.execute(collab_stmt)
    for c_row, username, email in collab_res.all():
        uname = username or email
        if uname and uname.lower() not in seen_collabs:
            role = getattr(c_row, "role", "editor") or "editor"
            collaborators_list.append({"username": uname, "role": role})
            seen_collabs.add(uname.lower())
    
    category_name = deck.category.name if deck.category else "General"
    tags = [t.name for t in deck.tags]
    
    excel_bytes = ExcelDeckService.export_deck_to_excel(
        deck_title=deck.title,
        deck_description=deck.description,
        category_name=category_name,
        tags=tags,
        practice_settings=deck.practice_settings,
        cards=cards,
        exclude_ids=False,
        cover_image=deck.cover_image or "",
        instruction=deck.instruction or "",
        is_public=deck.is_public if deck.is_public is not None else True,
        time_limit=deck.time_limit or 0,
        collaborators=collaborators_list
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
        user_id = AuthService.get_user_id(request)
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
        matched_ids = set()
        
        for c_data in cards:
            raw_id = c_data.get("id")
            c_id = None
            if raw_id is not None:
                try:
                    c_id = int(float(str(raw_id).strip()))
                except (ValueError, TypeError):
                    c_id = None

            if c_id and c_id in existing_ids:
                updated_count += 1
                matched_ids.add(c_id)
            else:
                added_count += 1
                
        deleted_count_if_replace = len(existing_ids - matched_ids)

        return {
            "status": "ok",
            "title": metadata.get("title", deck.title),
            "description": metadata.get("description", deck.description),
            "total_excel_rows": len(cards),
            "updated_count": updated_count,
            "added_count": added_count,
            "deleted_count_if_replace": deleted_count_if_replace,
            "existing_total": len(existing_ids)
        }
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel analysis error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/{deck_id}/import-update")
async def import_update_deck(request: Request, deck_id: int, file: UploadFile = File(...), mode: str = Form("merge"), db: AsyncSession = Depends(get_db)):
    try:
        user_id = AuthService.get_user_id(request)
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
        if "cover_image" in metadata and metadata["cover_image"]:
            deck.cover_image = metadata["cover_image"]
        if "instruction" in metadata and metadata["instruction"]:
            deck.instruction = metadata["instruction"]
        if "is_public" in metadata:
            deck.is_public = metadata["is_public"]
        if "time_limit" in metadata:
            deck.time_limit = metadata["time_limit"]
        
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
            existing_ps = dict(deck.practice_settings) if deck.practice_settings else {}
            for k, v in metadata["practice_settings"].items():
                if isinstance(v, dict) and isinstance(existing_ps.get(k), dict):
                    merged_sub = dict(existing_ps[k])
                    merged_sub.update(v)
                    existing_ps[k] = merged_sub
                else:
                    existing_ps[k] = v
            deck.practice_settings = existing_ps
            
        if metadata.get("tags"):
            await DeckService.set_deck_tags(db, deck_id, metadata["tags"])
            
        # Import collaborators if present in Excel
        if metadata.get("collaborators"):
            for collab_info in metadata["collaborators"]:
                uname = collab_info.get("username")
                role = collab_info.get("role", "editor")
                if not uname: continue
                
                u_res = await db.execute(select(UserDB).where((UserDB.username == uname) | (UserDB.email == uname)))
                target_user = u_res.scalar_one_or_none()
                if target_user and target_user.id != deck.creator_id:
                    c_check = await db.execute(select(DeckCollaborator).where(
                        DeckCollaborator.deck_id == deck_id,
                        DeckCollaborator.user_id == target_user.id
                    ))
                    existing_collab = c_check.scalar_one_or_none()
                    if existing_collab:
                        if hasattr(existing_collab, "role"):
                            setattr(existing_collab, "role", role)
                    else:
                        db.add(DeckCollaborator(deck_id=deck_id, user_id=target_user.id))
            
        from app.modules.deck.models import Flashcard
        
        existing_c_res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        existing_c_map = {c.id: c for c in existing_c_res.scalars().all()}
        
        updated_ids = set()
        updated_count = 0
        added_count = 0
        deleted_count = 0
        
        for c_data in cards:
            raw_id = c_data.get("id")
            c_id = None
            if raw_id is not None:
                try:
                    c_id = int(float(str(raw_id).strip()))
                except (ValueError, TypeError):
                    c_id = None
            
            others = dict(c_data.get("others") or {})
            
            # Extract standard keys cleanly from c_data or others
            front_audio_content = c_data.get("front_audio_content") or others.pop("front_audio_content", None)
            back_audio_content = c_data.get("back_audio_content") or others.pop("back_audio_content", None)
            front_audio_url = c_data.get("front_audio_url") or others.pop("front_audio_url", None) or c_data.get("audio")
            back_audio_url = c_data.get("back_audio_url") or others.pop("back_audio_url", None)
            front_img = c_data.get("front_img") or others.pop("front_img", None) or c_data.get("image")
            back_img = c_data.get("back_img") or others.pop("back_img", None)
            
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
                merged_others = dict(db_c.others) if isinstance(db_c.others, dict) else {}
                merged_others.update(others)
                db_c.others = merged_others
                updated_ids.add(c_id)
                updated_count += 1
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
                added_count += 1
                
        # Support replace mode: clean up cards not in the incoming Excel list
        if mode == "replace":
            to_delete_ids = [c_id for c_id in existing_c_map.keys() if c_id not in updated_ids]
            if to_delete_ids:
                from app.modules.deck.models import UserCardMastery, UserPracticeStats, UserCardNote, UserAnswer
                await db.execute(delete(UserCardMastery).where(UserCardMastery.card_id.in_(to_delete_ids)))
                await db.execute(delete(UserPracticeStats).where(UserPracticeStats.card_id.in_(to_delete_ids)))
                await db.execute(delete(UserCardNote).where(UserCardNote.card_id.in_(to_delete_ids)))
                await db.execute(delete(UserAnswer).where(UserAnswer.card_id.in_(to_delete_ids)))
                await db.execute(delete(Flashcard).where(Flashcard.id.in_(to_delete_ids)))
                deleted_count = len(to_delete_ids)
                
        await db.commit()
        
        total_cards = len(existing_c_map) - deleted_count + added_count
        return {
            "status": "ok",
            "message": "Deck updated successfully.",
            "updated_count": updated_count,
            "added_count": added_count,
            "deleted_count": deleted_count,
            "total_cards": total_cards
        }
        
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/{deck_id}/import-text-update")
async def import_text_update(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user_id = AuthService.get_user_id(request)
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
    # Select text based on face and deck audio_configs
    text = ""
    target_url_col = ""
    norm_face = (face or "front").strip().lower()
    is_custom = norm_face not in ("front", "back")

    from app.modules.deck.models import FlashcardDeck
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == c.deck_id))
    deck = deck_res.scalar_one_or_none()

    target_lang = None
    voice_name = None
    voice_mapping = {}
    content_col = None
    matched_cfg = None

    if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
        ps = deck.practice_settings
        voice_mapping = ps.get("voice_mapping", {})
        audio_configs = ps.get("audio_configs", [])

        if audio_configs and isinstance(audio_configs, list):
            # 1. Match by data_col FIRST (this is the display column selected by user)
            matched_cfg = next((
                cfg for cfg in audio_configs
                if str(cfg.get("data_col") or "").strip().lower() == norm_face
            ), None)
            # 2. Match by source_col
            if not matched_cfg:
                matched_cfg = next((
                    cfg for cfg in audio_configs
                    if str(cfg.get("source_col") or "").strip().lower() == norm_face
                    or str(cfg.get("audio_content_col") or "").strip().lower() == norm_face
                ), None)
            # 3. Match by url_col
            if not matched_cfg:
                matched_cfg = next((
                    cfg for cfg in audio_configs
                    if str(cfg.get("url_col") or "").strip().lower() == norm_face
                    or str(cfg.get("audio_url_col") or "").strip().lower() == norm_face
                ), None)
            # 4. Match by id
            if not matched_cfg:
                matched_cfg = next((
                    cfg for cfg in audio_configs
                    if str(cfg.get("id") or "").strip().lower() == norm_face
                ), None)
            # Fallbacks for standard front/back
            if not matched_cfg:
                if norm_face == "front" and len(audio_configs) > 0:
                    matched_cfg = audio_configs[0]
                elif norm_face == "back" and len(audio_configs) > 1:
                    matched_cfg = audio_configs[1]

        if matched_cfg:
            target_lang = matched_cfg.get("lang")
            content_col = matched_cfg.get("source_col") or matched_cfg.get("audio_content_col")
            target_url_col = matched_cfg.get("url_col") or matched_cfg.get("audio_url_col")
        else:
            if not is_custom:
                cfg_key = "front_audio_config" if norm_face == "front" else "back_audio_config"
                cfg = ps.get(cfg_key, {})
                if isinstance(cfg, dict):
                    target_lang = cfg.get("lang")
                    content_col = cfg.get("audio_content_col")
                    target_url_col = cfg.get("audio_url_col")
            else:
                pairs = ps.get("audio_pairs", [])
                pair = next((
                    p for p in pairs
                    if str(p.get("text_col") or p.get("data_col") or "").strip().lower() == norm_face
                ), None)
                if pair:
                    target_lang = pair.get("lang")
                    content_col = pair.get("audio_content_col")
                    target_url_col = pair.get("audio_url_col")

        if target_lang and voice_mapping:
            clean_l = target_lang.replace("gtts:", "")
            voice_name = voice_mapping.get(clean_l)

    if target_lang == "none":
        return None

    # Fallback default target_url_col
    if not target_url_col:
        if norm_face == "front" or (matched_cfg and matched_cfg.get("data_col") == "front"):
            target_url_col = "front_audio_url"
        elif norm_face == "back" or (matched_cfg and matched_cfg.get("data_col") == "back"):
            target_url_col = "back_audio_url"
        else:
            target_url_col = f"{face}_audio_url"

    # ── STEP 1: CHECK IF AUDIO URL ALREADY EXISTS (CACHE-FIRST) ──
    # If not force and card already has an audio link for this column, NEVER regenerate!
    if not force:
        existing_url = None

        # 1. Check target_url_col in c.others (case-insensitive)
        if target_url_col and c.others and isinstance(c.others, dict):
            lower_target = target_url_col.strip().lower()
            for k, v in c.others.items():
                if str(k).strip().lower() == lower_target and v and str(v).strip():
                    existing_url = str(v).strip()
                    break

        # 2. Check direct attribute on c
        if not existing_url and target_url_col and hasattr(c, target_url_col):
            val = getattr(c, target_url_col, None)
            if val and str(val).strip():
                existing_url = str(val).strip()

        # 3. Check front / back standard fields
        if not existing_url:
            if norm_face == "front" or (matched_cfg and matched_cfg.get("data_col") == "front"):
                if c.audio and str(c.audio).strip():
                    existing_url = str(c.audio).strip()
                elif hasattr(c, "front_audio_url") and c.front_audio_url and str(c.front_audio_url).strip():
                    existing_url = str(c.front_audio_url).strip()
                elif c.others and isinstance(c.others, dict) and c.others.get("front_audio_url"):
                    existing_url = str(c.others.get("front_audio_url")).strip()
            elif norm_face == "back" or (matched_cfg and matched_cfg.get("data_col") == "back"):
                if hasattr(c, "back_audio_url") and c.back_audio_url and str(c.back_audio_url).strip():
                    existing_url = str(c.back_audio_url).strip()
                elif c.others and isinstance(c.others, dict) and c.others.get("back_audio_url"):
                    existing_url = str(c.others.get("back_audio_url")).strip()

        if existing_url:
            logger.info(f"[AUDIO CACHE HIT] Card {c.id} column '{face}' has existing audio link: '{existing_url}'. Reading directly without regeneration.")
            # Resolve central:// or relative URLs if needed
            from app.modules.sso_module.service import SSOService
            try:
                sso_config = await SSOService.get_config(db)
                if sso_config.is_enabled and sso_config.server_url:
                    base = sso_config.server_url.rstrip('/')
                    if existing_url.startswith("central://"):
                        return f"{base}/static/{existing_url[10:].lstrip('/')}"
                    elif existing_url.startswith("central-tts://"):
                        return f"{base}/static/uploads/tts/{existing_url[14:].lstrip('/')}"
                    elif existing_url.startswith("central-media://"):
                        return f"{base}/static/uploads/media/{existing_url[16:].lstrip('/')}"
                    elif existing_url.startswith("/static/"):
                        return f"{base}{existing_url}"
            except Exception:
                pass
            return existing_url

    # ── STEP 2: EXTRACT READING TEXT (source_col) ──
    if content_col:
        lower_content = content_col.strip().lower()
        if lower_content in ("front", "content"):
            text = c.content
        elif lower_content in ("back", "explanation"):
            text = c.explanation
        elif c.others and isinstance(c.others, dict):
            for k, v in c.others.items():
                if str(k).strip().lower() == lower_content and v and str(v).strip():
                    text = str(v).strip()
                    break
        if not text and hasattr(c, content_col):
            val = getattr(c, content_col, None)
            if val and str(val).strip():
                text = str(val).strip()

    if not text:
        # Fallback to display column / face
        if norm_face in ("front", "content"):
            text = c.front_audio_content or (c.others.get("front_audio_content") if c.others and isinstance(c.others, dict) else None) or c.content
        elif norm_face in ("back", "explanation"):
            text = c.back_audio_content or (c.others.get("back_audio_content") if c.others and isinstance(c.others, dict) else None) or c.explanation
        elif c.others and isinstance(c.others, dict):
            for k, v in c.others.items():
                if str(k).strip().lower() == norm_face and v and str(v).strip():
                    text = str(v).strip()
                    break
        if not text and hasattr(c, face):
            val = getattr(c, face, None)
            if val and str(val).strip():
                text = str(val).strip()

    if not text or not str(text).strip():
        return None

    from app.modules.deck.services.audio_generator import AudioGenerator
    text = AudioGenerator.clean_text_for_tts(str(text))
    if not text:
        return None

    # Determine physical path and absolute URL based on requested deck_id and card_id
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(c.deck_id), "audio")

    if not is_custom:
        filename = f"{c.id}_front.mp3" if norm_face == "front" else f"{c.id}_back.mp3"
    else:
        safe_face = re.sub(r'[^a-zA-Z0-9_-]', '_', face)
        filename = f"{c.id}_{safe_face}.mp3"

    physical_path = os.path.join(folder_path, filename)
    url = f"/uploads/{c.deck_id}/audio/{filename}"

    # Check if we already have it generated on local disk (skip if force=True)
    if os.path.exists(physical_path) and not force:
        if not c.others:
            c.others = {}
        if target_url_col:
            c.others[target_url_col] = url
        if norm_face == "front" or (matched_cfg and matched_cfg.get("data_col") == "front"):
            c.audio = url
        elif norm_face == "back" or (matched_cfg and matched_cfg.get("data_col") == "back"):
            c.back_audio_url = url
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
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
                tts_payload = {
                    "text": text,
                    "app": "vocaburn",
                    "folder": str(c.deck_id),
                    "subfolder": "audio"
                }
                if target_lang:
                    tts_payload["lang"] = target_lang
                if voice_name:
                    tts_payload["voice_name"] = voice_name
                if voice_mapping:
                    tts_payload["voice_mapping"] = voice_mapping
                response = await client.post(
                     f"{sso_config.server_url.rstrip('/')}/api/tts/generate",
                     json=tts_payload,
                     timeout=20.0
                )
                if response.status_code == 200:
                    data = response.json()
                    filename_tts = data.get("filename") or os.path.basename(data.get("url"))
                    central_ref = data.get("canonical_url") or f"central://vocaburn/{c.deck_id}/audio/{filename_tts}"

                    # ── SAVE TO DATABASE (target_url_col & others) ──
                    if not c.others:
                        c.others = {}
                    if target_url_col:
                        c.others[target_url_col] = central_ref
                    if norm_face == "front" or (matched_cfg and matched_cfg.get("data_col") == "front"):
                        c.audio = central_ref
                    elif norm_face == "back" or (matched_cfg and matched_cfg.get("data_col") == "back"):
                        c.back_audio_url = central_ref

                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(c, "others")
                    await db.commit()

                    # Return the fully resolved URL for immediate UI play/preview
                    rel_url = data.get("url") or f"/static/vocaburn/{c.deck_id}/audio/{filename_tts}"
                    resolved_url = f"{sso_config.server_url.rstrip('/')}{rel_url}" if rel_url.startswith("/") else rel_url
                    logger.info(f"[TTS CENTRAL SUCCESS] Stored logical reference {central_ref} in card {c.id} ({target_url_col})")
                    return resolved_url
                else:
                    logger.error(f"[TTS CENTRAL ERROR] Centralized TTS endpoint returned status {response.status_code}: {response.text}")
    except Exception as sso_err:
        logger.warning(f"[TTS CENTRAL WARNING] Centralized TTS request failed, will fallback to local generation: {sso_err}")

    # Fallback to local generation if centralized TTS failed or wasn't active
    if not success:
        try:
            from app.modules.deck.services.audio_generator import AudioGenerator
            logger.info(f"[TTS LOCAL] Generating TTS locally for text: '{text[:30]}...' with lang: {target_lang}")
            success = await AudioGenerator.generate_tts(text, physical_path, target_lang)
        except Exception as e:
            import traceback
            logger.error(f"Failed to generate audio locally: {e}\n{traceback.format_exc()}")
            return None

    if not success:
        return None

    # Save local URL back to database
    if not c.others:
        c.others = {}
    if target_url_col:
        c.others[target_url_col] = url
    if norm_face == "front" or (matched_cfg and matched_cfg.get("data_col") == "front"):
        c.audio = url
    elif norm_face == "back" or (matched_cfg and matched_cfg.get("data_col") == "back"):
        c.back_audio_url = url

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(c, "others")
    await db.commit()
    return url

