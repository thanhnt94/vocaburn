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

@router.get("/generate-audio/{card_id}")
async def generate_card_audio(card_id: int, request: Request, face: str = "front", force: bool = False, db: AsyncSession = Depends(get_db)):
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).filter(Flashcard.id == card_id))
    c = res.scalar_one_or_none()
    if not c:
        return JSONResponse(status_code=404, content={"error": "Card not found"})
        
    from .deck_excel import generate_single_card_audio_helper
    url = await generate_single_card_audio_helper(c, face, force, db)
    if not url:
        return JSONResponse(status_code=500, content={"error": "Failed to generate audio"})
        
    return {"url": url}

import hashlib

@router.get("/tts/stream")
async def stream_dynamic_tts(text: str, lang: Optional[str] = None):
    if not text or not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text is required"})
        
    from app.modules.deck.services.audio_generator import AudioGenerator
    cleaned_text = AudioGenerator.clean_text_for_tts(text)
    if not cleaned_text:
        return JSONResponse(status_code=400, content={"error": "Text is empty after cleaning"})
    target_lang = lang.strip().lower() if lang and lang.strip() else "multi"
    
    hash_key = hashlib.md5(f"{cleaned_text}_{target_lang}".encode("utf-8")).hexdigest()
    from app.core.config import settings
    tts_dir = os.path.join(settings.VOCABURN_STORAGE_DIR, "tts_cache")
    os.makedirs(tts_dir, exist_ok=True)
    physical_path = os.path.join(tts_dir, f"{hash_key}.mp3")
    url = f"/uploads/tts_cache/{hash_key}.mp3"
    
    if not os.path.exists(physical_path):
        from app.modules.deck.services.audio_generator import AudioGenerator
        success = await AudioGenerator.generate_tts(cleaned_text, physical_path, target_lang)
        if not success:
            return JSONResponse(status_code=500, content={"error": "Failed to synthesize TTS"})
            
    return {"url": url}

async def _bulk_generate_deck_audio_task(deck_id: int, target_face: str, force: bool, base_url: str, card_ids: list = None, custom_source: str = None, custom_target: str = None, voice_name: str = None, custom_voice_mapping: dict = None):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard, FlashcardDeck
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]

        DEFAULT_VOICE_MAPPING = {
            'ja': 'ja-JP-NanamiNeural',
            'vi': 'vi-VN-HoaiMyNeural',
            'en': 'en-US-AriaNeural',
            'zh': 'zh-CN-XiaoxiaoNeural',
            'ko': 'ko-KR-SunHiNeural'
        }

        deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
        deck = deck_res.scalar_one_or_none()

        ps = deck.practice_settings if (deck and deck.practice_settings and isinstance(deck.practice_settings, dict)) else {}
        voice_mapping = dict(DEFAULT_VOICE_MAPPING)
        if ps.get("voice_mapping") and isinstance(ps["voice_mapping"], dict):
            voice_mapping.update(ps["voice_mapping"])
        if custom_voice_mapping and isinstance(custom_voice_mapping, dict):
            voice_mapping.update(custom_voice_mapping)
        
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

        # Determine faces to process
        faces_to_process = []
        audio_configs = ps.get("audio_configs", [])

        if custom_source and custom_target:
            faces_to_process.append({
                "face": custom_target,
                "src": custom_source,
                "tgt": custom_target,
                "lang": voice_name or "multi"
            })
        elif target_face == "all":
            if audio_configs:
                for cfg in audio_configs:
                    src = cfg.get("source_col") or cfg.get("audio_content_col")
                    tgt = cfg.get("url_col") or cfg.get("audio_url_col")
                    lang = cfg.get("lang", "multi")
                    if src and tgt and lang != "none":
                        faces_to_process.append({"face": tgt, "src": src, "tgt": tgt, "lang": lang})
            else:
                front_cfg = ps.get("front_audio_config", {})
                back_cfg = ps.get("back_audio_config", {})
                faces_to_process.append({
                    "face": "front",
                    "src": front_cfg.get("audio_content_col") or "front_audio_content",
                    "tgt": front_cfg.get("audio_url_col") or "front_audio_url",
                    "lang": front_cfg.get("lang")
                })
                faces_to_process.append({
                    "face": "back",
                    "src": back_cfg.get("audio_content_col") or "back_audio_content",
                    "tgt": back_cfg.get("audio_url_col") or "back_audio_url",
                    "lang": back_cfg.get("lang")
                })
        else:
            # Check if target_face matches an id or url_col or name in audio_configs
            matched_cfg = next((c for c in audio_configs if c.get("id") == target_face or c.get("url_col") == target_face or c.get("audio_url_col") == target_face or c.get("source_col") == target_face), None)
            if matched_cfg:
                src = matched_cfg.get("source_col") or matched_cfg.get("audio_content_col")
                tgt = matched_cfg.get("url_col") or matched_cfg.get("audio_url_col")
                lang = matched_cfg.get("lang", "multi")
                faces_to_process.append({"face": tgt, "src": src, "tgt": tgt, "lang": lang})
            elif target_face == "front":
                front_cfg = ps.get("front_audio_config", {})
                src = custom_source or front_cfg.get("audio_content_col") or "front_audio_content"
                tgt = custom_target or front_cfg.get("audio_url_col") or "front_audio_url"
                faces_to_process.append({"face": "front", "src": src, "tgt": tgt, "lang": front_cfg.get("lang") or voice_name})
            elif target_face == "back":
                back_cfg = ps.get("back_audio_config", {})
                src = custom_source or back_cfg.get("audio_content_col") or "back_audio_content"
                tgt = custom_target or back_cfg.get("audio_url_col") or "back_audio_url"
                faces_to_process.append({"face": "back", "src": src, "tgt": tgt, "lang": back_cfg.get("lang") or voice_name})
            else:
                faces_to_process.append({
                    "face": custom_target or target_face,
                    "src": custom_source or target_face,
                    "tgt": custom_target or target_face,
                    "lang": voice_name or "multi"
                })

        for c in cards:
            await db.refresh(c)
            for f_spec in faces_to_process:
                src_col = f_spec["src"]
                tgt_col = f_spec["tgt"]
                face_name = f_spec["face"]
                face_lang = f_spec.get("lang")

                if face_lang == "none":
                    continue

                # Determine prompt text
                text = ""
                if src_col == "front_audio_content":
                    text = c.front_audio_content or (c.others.get("front_audio_content") if c.others else None) or c.content
                elif src_col == "back_audio_content":
                    text = c.back_audio_content or (c.others.get("back_audio_content") if c.others else None) or c.explanation
                elif src_col == "front":
                    text = c.content
                elif src_col == "back":
                    text = c.explanation
                elif c.others and src_col in c.others:
                    text = c.others.get(src_col)
                elif hasattr(c, src_col):
                    text = getattr(c, src_col)

                if not text or not str(text).strip():
                    continue
                from app.modules.deck.services.audio_generator import AudioGenerator
                text = AudioGenerator.clean_text_for_tts(str(text))
                if not text:
                    continue

                # Check if already has audio
                has_audio = False
                if tgt_col == "front_audio_url":
                    has_audio = bool(c.front_audio_url and c.front_audio_url.strip())
                elif tgt_col == "back_audio_url":
                    has_audio = bool(c.back_audio_url and c.back_audio_url.strip())
                elif c.others and tgt_col in c.others:
                    has_audio = bool(c.others.get(tgt_col) and str(c.others.get(tgt_col)).strip())

                if force or not has_audio:
                    clean_lang = (face_lang or "multi").replace("gtts:", "") if face_lang else "multi"
                    selected_voice = voice_mapping.get(clean_lang) if (voice_mapping and clean_lang != "multi") else None
                    task_item = {
                        "satellite_source": "vocaburn",
                        "prompt": text,
                        "callback_url": callback_url,
                        "lang": clean_lang,
                        "voice_name": selected_voice,
                        "extra_data": json.dumps({
                            "task_type": "tts",
                            "card_id": c.id,
                            "face": tgt_col,
                            "deck_id": deck_id,
                            "lang": clean_lang,
                            "voice_name": selected_voice,
                            "voice_mapping": voice_mapping
                        }),
                        "max_retries": 3
                    }
                    tasks_to_submit.append(task_item)

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
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to generate audio for this deck"})

    from app.modules.deck.models import FlashcardDeck
    res = await db.execute(select(FlashcardDeck).filter(FlashcardDeck.id == deck_id))
    deck = res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    force = False
    target_face = "front"
    source_field = None
    target_field = None
    card_ids = None
    voice_name = None
    
    if payload:
        force = payload.get("force", False)
        target_face = payload.get("target_face", "front")
        source_field = payload.get("source_field")
        target_field = payload.get("target_field")
        card_ids = payload.get("card_ids")
        voice_name = payload.get("voice_name") or payload.get("lang")
        voice_mapping = payload.get("voice_mapping")
        
    # Detect scheme dynamically (e.g. support HTTPS behind Nginx reverse proxy)
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    
    # Force HTTPS for any production domain to bypass Nginx configuration gaps
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
        
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_audio_task, deck_id, target_face, force, base_url, card_ids, source_field, target_field, voice_name, voice_mapping)
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
    total_with_audio = 0
    total_missing_audio = 0
    total_with_content = 0
    cards_list = []
    
    for c in cards:
        # Determine text
        if source_field in ("front", "content"):
            text = c.content or (c.others.get("front") if isinstance(c.others, dict) else None)
        elif source_field in ("back", "explanation"):
            text = c.explanation or (c.others.get("back") if isinstance(c.others, dict) else None)
        elif source_field == "front_audio_content":
            text = c.front_audio_content or (c.others.get("front_audio_content") if isinstance(c.others, dict) else None) or c.content
        elif source_field == "back_audio_content":
            text = c.back_audio_content or (c.others.get("back_audio_content") if isinstance(c.others, dict) else None) or c.explanation
        else:
            text = c.others.get(source_field) if isinstance(c.others, dict) else None
            
        has_content = bool(text and str(text).strip())
        if has_content:
            total_with_content += 1
            
        # Check target field for audio URL
        has_audio = False
        if target_field in ("front_audio_url", "audio"):
            has_audio = bool(
                (c.front_audio_url and str(c.front_audio_url).strip()) or
                (isinstance(c.others, dict) and c.others.get("front_audio_url") and str(c.others.get("front_audio_url")).strip()) or
                (isinstance(c.others, dict) and c.others.get("audio") and str(c.others.get("audio")).strip())
            )
        elif target_field == "back_audio_url":
            has_audio = bool(
                (c.back_audio_url and str(c.back_audio_url).strip()) or
                (isinstance(c.others, dict) and c.others.get("back_audio_url") and str(c.others.get("back_audio_url")).strip())
            )
        else:
            has_audio = bool(isinstance(c.others, dict) and c.others.get(target_field) and str(c.others.get(target_field)).strip())
            
        if has_audio:
            total_with_audio += 1
        else:
            total_missing_audio += 1
            
        cards_list.append({
            "id": c.id,
            "content": c.content,
            "has_audio": has_audio,
            "missing": not has_audio
        })
            
    return {
        "total_cards": total,
        "total_with_audio": total_with_audio,
        "total_missing_audio": total_missing_audio,
        "total_with_content": total_with_content,
        "missing_audio_cards": total_missing_audio,
        "cards": cards_list
    }

def _verify_queue_token(request: Request):
    from app.core.config import settings
    token = request.headers.get("X-Queue-Token") or request.query_params.get("token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    valid_tokens = {
        "super-secret-token-123",
        getattr(settings, "CENTRALAUTH_QUEUE_TOKEN", "super-secret-token-123"),
        getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
    }
    valid_tokens = {t for t in valid_tokens if t}

    if token and token in valid_tokens:
        return True

    # Internal loopback / server IP fallback check
    client_ip = request.client.host if request.client else ""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    allowed_ips = {"127.0.0.1", "::1", "localhost", "103.121.91.217"}
    if client_ip in allowed_ips or any(ip.strip() in allowed_ips for ip in forwarded_for.split(",")):
        logger.info(f"[QueueCallback] Token missing/unmatched ('{token}'), allowed via server loopback IP ({client_ip or forwarded_for}).")
        return True

    logger.error(f"[QueueCallback] Unauthorized callback attempt. Token: '{token}', Client: {client_ip}, X-Forwarded-For: {forwarded_for}")
    raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing X-Queue-Token")

@router.post("/tts-callback")
async def tts_queue_callback(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    _verify_queue_token(request)
    task_id = data.get("task_id") or data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[TTS CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if isinstance(extra_data_str, str) else (extra_data_str or {})
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
    if face in ("front", "front_audio_url"):
        target_attr = "front_audio_url"
    elif face in ("back", "back_audio_url"):
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
        
    if face == "audio" or target_attr == "audio":
        c.front_audio_url = central_ref
        if not c.others:
            c.others = {}
        c.others["audio"] = central_ref
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(c, "others")
        
    await db.commit()
    logger.info(f"[TTS CALLBACK SUCCESS] Updated card {card_id} field '{target_attr}' with central reference {central_ref}.")
    return {"status": "ok"}

@router.post("/image-callback")
async def image_queue_callback(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    _verify_queue_token(request)
    task_id = data.get("task_id") or data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[IMAGE CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if isinstance(extra_data_str, str) else (extra_data_str or {})
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
async def furigana_queue_callback(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    _verify_queue_token(request)
    task_id = data.get("task_id") or data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[FURIGANA CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if isinstance(extra_data_str, str) else (extra_data_str or {})
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
async def ai_queue_callback(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    _verify_queue_token(request)
    task_id = data.get("task_id") or data.get("id")
    status = data.get("status")
    result = data.get("result")
    extra_data_str = data.get("extra_data")
    
    if status != "completed" or not result:
        logger.warning(f"[AI CALLBACK] Task {task_id} status '{status}' was not processed or has no result.")
        return {"status": "ignored"}
        
    try:
        extra = json.loads(extra_data_str) if isinstance(extra_data_str, str) else (extra_data_str or {})
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
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to generate AI content for this deck"})

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
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to generate images for this deck"})

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

async def _bulk_generate_deck_furigana_task(deck_id: int, source_field: str, target_field: str, card_ids: list, base_url: str, db_session_maker):
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
            callback_base = settings.APP_BASE_URL if settings.APP_BASE_URL else base_url
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
    request: Request,
    payload: dict = None,
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to generate furigana for this deck"})

    from app.core.db import SessionLocal
    
    source_field = "front"
    target_field = "front"
    card_ids = None
    if payload:
        source_field = payload.get("source_field", "front")
        target_field = payload.get("target_field", "front")
        card_ids = payload.get("card_ids", None)
        
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(
        _bulk_generate_deck_furigana_task,
        deck_id,
        source_field,
        target_field,
        card_ids,
        base_url,
        SessionLocal
    )
    return {"status": "started", "message": "Batch Furigana generation task has been queued."}
