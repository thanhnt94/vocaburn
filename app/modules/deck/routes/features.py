from fastapi import APIRouter, UploadFile, File, Form, Depends, Request, BackgroundTasks
from typing import Optional
import logging

logger = logging.getLogger(__name__)
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
from app.modules.deck.models import UserDeckSettings
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
import json
import re
import os
import asyncio
from datetime import datetime, timezone, date, timedelta

router = APIRouter(tags=["Deck"])

from app.modules.deck.services.fsrs_service import build_fsrs_card
from app.modules.deck.utils import migrate_practice_settings, resolve_effective_study_settings, STUDY_SETTINGS_KEYS

@router.get("/{deck_id}/practice-settings")
async def get_practice_settings(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
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
    user_settings = migrate_practice_settings(user_sett.settings) if user_sett else {}
    
    # User settings contain personal roadmap pipeline & roadmap_active toggle,
    # while MCQ, Typing, Listening Q&A pairs are strictly locked to creator defaults.
    merged_user_settings = {
        **user_settings,
        "mcq": creator_settings.get("mcq", {}),
        "typing": creator_settings.get("typing", {}),
        "listening": creator_settings.get("listening", {})
    }

    SYSTEM_DEFAULTS = [
        "front", "back", 
        "front_audio_content", "back_audio_content", 
        "front_audio_url", "back_audio_url", 
        "front_img", "back_img"
    ]
    
    saved_order = creator_settings.get("column_order", [])
    if saved_order and isinstance(saved_order, list):
        ordered_cols = [c for c in saved_order if c in available_cols]
        for c in available_cols:
            if c not in ordered_cols:
                ordered_cols.append(c)
    else:
        ordered_cols = [c for c in SYSTEM_DEFAULTS if c in available_cols]
        for c in available_cols:
            if c not in ordered_cols:
                ordered_cols.append(c)

    study_resolved = resolve_effective_study_settings(
        deck.practice_settings,
        user_sett.settings if user_sett else None
    )

    return {
        "creator_settings": creator_settings,
        "user_settings": merged_user_settings,
        "available_columns": ordered_cols,
        "column_order": ordered_cols,
        "deck_name": deck.title,
        "study_defaults": study_resolved["creator_study_defaults"],
        "creator_study_defaults": study_resolved["creator_study_defaults"],
        "user_study_settings": study_resolved["user_study_settings"],
        "effective_study_settings": study_resolved["effective_study_settings"],
        "is_study_customized": study_resolved["is_customized"]
    }

@router.post("/{deck_id}/practice-settings")
async def save_practice_settings(request: Request, deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    is_creator = payload.get("is_creator", False)
    settings = payload.get("settings")
    if is_creator and settings:
        audio_configs = settings.get("audio_configs") or []
        for c_idx, cfg in enumerate(audio_configs):
            cfg_url = cfg.get("url_col") or cfg.get("audio_url_col")
            cfg_src = cfg.get("source_col") or cfg.get("audio_content_col")
            cfg_name = cfg.get("name") or f"#{c_idx + 1}"
            if cfg_url and cfg_src:
                if cfg_url == cfg_src:
                    return JSONResponse(status_code=400, content={"error": f"Cấu hình '{cfg_name}': Cột đường dẫn âm thanh không được trùng với cột kịch bản đọc."})
                if cfg_url in ("front", "back") and cfg_src in ("front", "back"):
                    return JSONResponse(status_code=400, content={"error": f"Cấu hình '{cfg_name}': Cột đường dẫn âm thanh không được trùng với cột nội dung chính (front/back)."})

        front_cfg = settings.get("front_audio_config") or {}
        back_cfg = settings.get("back_audio_config") or {}
        custom_pairs = settings.get("audio_pairs") or []
        
        # Check front_audio_config
        front_url_col = front_cfg.get("audio_url_col")
        front_content_col = front_cfg.get("audio_content_col")
        if front_url_col:
            if front_url_col == front_content_col:
                return JSONResponse(status_code=400, content={"error": "Mặt trước: Cột đường dẫn âm thanh không được trùng với cột kịch bản đọc."})
            if front_url_col in ("front", "back") and front_content_col in ("front", "back"):
                return JSONResponse(status_code=400, content={"error": "Mặt trước: Cột đường dẫn âm thanh không được trùng với cột nội dung chính (front/back)."})
                
        # Check back_audio_config
        back_url_col = back_cfg.get("audio_url_col")
        back_content_col = back_cfg.get("audio_content_col")
        if back_url_col:
            if back_url_col == back_content_col:
                return JSONResponse(status_code=400, content={"error": "Mặt sau: Cột đường dẫn âm thanh không được trùng với cột kịch bản đọc."})
            if back_url_col in ("front", "back") and back_content_col in ("front", "back"):
                return JSONResponse(status_code=400, content={"error": "Mặt sau: Cột đường dẫn âm thanh không được trùng với cột nội dung chính (front/back)."})
                
        # Check custom pairs
        for c_idx, pair in enumerate(custom_pairs):
            pair_url_col = pair.get("audio_url_col")
            pair_content_col = pair.get("audio_content_col")
            pair_text_col = pair.get("text_col")
            if pair_url_col:
                if pair_url_col == pair_content_col:
                    return JSONResponse(status_code=400, content={"error": f"Cặp custom #{c_idx+1}: Cột đường dẫn âm thanh không được trùng với cột kịch bản đọc."})
                if pair_url_col == pair_text_col:
                    return JSONResponse(status_code=400, content={"error": f"Cặp custom #{c_idx+1}: Cột đường dẫn âm thanh không được trùng với cột nội dung chính."})
                if pair_url_col in ("front", "back") and pair_content_col in ("front", "back"):
                    return JSONResponse(status_code=400, content={"error": f"Cặp custom #{c_idx+1}: Cột đường dẫn âm thanh không được trùng với cột nội dung chính (front/back)."})

    user_id = AuthService.get_user_id(request)
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
            deck.practice_settings = settings or {}
        else:
            merged = {}
            if isinstance(deck.practice_settings, dict):
                merged.update(deck.practice_settings)
            if isinstance(settings, dict):
                merged.update(settings)
                # Deep merge study_defaults if both present
                if "study_defaults" in deck.practice_settings and isinstance(deck.practice_settings["study_defaults"], dict) and "study_defaults" in settings and isinstance(settings["study_defaults"], dict):
                    merged_sd = dict(deck.practice_settings["study_defaults"])
                    merged_sd.update(settings["study_defaults"])
                    merged["study_defaults"] = merged_sd
            deck.practice_settings = merged
        flag_modified(deck, "practice_settings")
        await db.commit()
    else:
        # Save user settings for roadmap pipeline, roadmap_active, and user preferences
        reset_study_defaults = payload.get("reset_study_defaults", False)
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none()
        from sqlalchemy.orm.attributes import flag_modified
        
        if reset_study_defaults and user_sett and isinstance(user_sett.settings, dict):
            for k in STUDY_SETTINGS_KEYS:
                user_sett.settings.pop(k, None)
            if "study_settings" in user_sett.settings:
                user_sett.settings.pop("study_settings", None)
            flag_modified(user_sett, "settings")
            await db.commit()
            return {"status": "ok", "message": "Reset to creator defaults"}

        if not user_sett:
            cleaned_settings = dict(settings) if isinstance(settings, dict) else {}
            user_sett = UserDeckSettings(user_id=user_id, deck_id=deck_id, settings=cleaned_settings)
            db.add(user_sett)
        elif not settings:
            user_sett.settings = {}
            flag_modified(user_sett, "settings")
        else:
            merged = dict(user_sett.settings) if isinstance(user_sett.settings, dict) else {}
            if isinstance(settings, dict):
                merged.update(settings)
            user_sett.settings = merged
            flag_modified(user_sett, "settings")
            
    await db.commit()
    
    # Smart diff pipeline comparison + history recording
    if settings and "pipeline" in settings and not is_creator:
        from app.modules.deck.models import DeckAttempt, RoadmapPipelineHistory
        from sqlalchemy import delete
        
        new_pipeline = settings.get("pipeline", [])
        
        # Get old pipeline from previous settings
        old_settings = {}
        if user_sett and isinstance(user_sett.settings, dict):
            old_settings = user_sett.settings
        old_pipeline = old_settings.get("pipeline", [])
        
        # Compare pipelines to determine change_type
        change_type = _compare_pipelines(old_pipeline, new_pipeline)
        
        # Generate Vietnamese summary
        change_summary = _generate_change_summary(old_pipeline, new_pipeline, change_type)
        
        today_date = datetime.utcnow().date()
        
        # Close previous active history entry
        prev_active_res = await db.execute(
            select(RoadmapPipelineHistory).where(
                RoadmapPipelineHistory.user_id == user_id,
                RoadmapPipelineHistory.deck_id == deck_id,
                RoadmapPipelineHistory.effective_until == None
            ).order_by(RoadmapPipelineHistory.changed_at.desc()).limit(1)
        )
        prev_active = prev_active_res.scalar_one_or_none()
        if prev_active:
            prev_active.effective_until = today_date
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(prev_active, "effective_until")
        
        # Determine effective_from based on change_type
        if change_type == "downgrade":
            effective_from = today_date
        else:
            # Upgrade/reorder: apply from tomorrow
            effective_from = today_date + timedelta(days=1) if old_pipeline else today_date
        
        # Record history entry
        history_entry = RoadmapPipelineHistory(
            user_id=user_id,
            deck_id=deck_id,
            pipeline_json=new_pipeline,
            change_type=change_type,
            change_summary=change_summary,
            effective_from=effective_from,
            effective_until=None
        )
        db.add(history_entry)
        
        # Only reset today's progress on DOWNGRADE
        if change_type == "downgrade":
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 1. Delete today's test attempts to reset MCQ/Typing scores
            await db.execute(
                delete(DeckAttempt).where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.deck_id == deck_id,
                    DeckAttempt.mode.in_(["roadmap_mcq", "roadmap_test", "mcq", "roadmap_typing", "typing"]),
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= today_start
                )
            )
            

        
        await db.commit()

    return {"status": "ok"}


def _compare_pipelines(old_pipeline: list, new_pipeline: list) -> str:
    """Compare old vs new pipeline. Returns 'initial', 'upgrade', 'downgrade', or 'reorder'."""
    if not old_pipeline:
        return "initial"
    
    old_types = [s.get("type") for s in old_pipeline]
    new_types = [s.get("type") for s in new_pipeline]
    
    # Check if any steps were removed → downgrade
    old_type_counts = {}
    for t in old_types:
        old_type_counts[t] = old_type_counts.get(t, 0) + 1
    new_type_counts = {}
    for t in new_types:
        new_type_counts[t] = new_type_counts.get(t, 0) + 1
    
    for t, count in old_type_counts.items():
        if new_type_counts.get(t, 0) < count:
            return "downgrade"
    
    # Check if any thresholds/counts were lowered → downgrade
    NUMERIC_FIELDS = ["daily_count", "question_count", "pass_threshold", "target_minutes", "overdue_hours"]
    for i, old_step in enumerate(old_pipeline):
        # Find matching step by type in new pipeline
        matching_new = [s for s in new_pipeline if s.get("type") == old_step.get("type")]
        if not matching_new:
            return "downgrade"  # step type removed
        # Compare with first matching (order might have changed)
        new_step = matching_new[0]
        for field in NUMERIC_FIELDS:
            old_val = old_step.get(field)
            new_val = new_step.get(field)
            if old_val is not None and new_val is not None:
                if int(new_val) < int(old_val):
                    return "downgrade"
    
    # Check if steps were added or thresholds raised → upgrade
    for t, count in new_type_counts.items():
        if count > old_type_counts.get(t, 0):
            return "upgrade"
    
    for i, new_step in enumerate(new_pipeline):
        matching_old = [s for s in old_pipeline if s.get("type") == new_step.get("type")]
        if not matching_old:
            return "upgrade"
        old_step = matching_old[0]
        for field in NUMERIC_FIELDS:
            old_val = old_step.get(field)
            new_val = new_step.get(field)
            if old_val is not None and new_val is not None:
                if int(new_val) > int(old_val):
                    return "upgrade"
    
    # Only order changed
    if old_types != new_types:
        return "reorder"
    
    return "reorder"


def _generate_change_summary(old_pipeline: list, new_pipeline: list, change_type: str) -> str:
    """Generate a Vietnamese summary of pipeline changes."""
    STEP_NAMES = {
        "new_cards": "Học Từ Mới",
        "fsrs_review": "Ôn Tập FSRS",
        "mcq": "Trắc Nghiệm MCQ",
        "typing": "Gõ Từ Vựng",
        "study_time": "Thời Gian Học"
    }
    
    if change_type == "initial":
        steps = [STEP_NAMES.get(s.get("type"), s.get("type", "?")) for s in new_pipeline]
        return f"Thiết lập lộ trình ban đầu: {', '.join(steps)}"
    
    changes = []
    old_types = {s.get("type") for s in old_pipeline}
    new_types = {s.get("type") for s in new_pipeline}
    
    # Added steps
    added = new_types - old_types
    for t in added:
        changes.append(f"+ Thêm bước: {STEP_NAMES.get(t, t)}")
    
    # Removed steps
    removed = old_types - new_types
    for t in removed:
        changes.append(f"- Xóa bước: {STEP_NAMES.get(t, t)}")
    
    # Changed params
    NUMERIC_FIELDS = {"daily_count": "Từ mới/ngày", "question_count": "Số câu", "pass_threshold": "Ngưỡng đỗ", "target_minutes": "Phút mục tiêu", "overdue_hours": "Giờ quá hạn"}
    for old_step in old_pipeline:
        stype = old_step.get("type")
        if stype in removed:
            continue
        matching = [s for s in new_pipeline if s.get("type") == stype]
        if not matching:
            continue
        new_step = matching[0]
        for field, label in NUMERIC_FIELDS.items():
            old_val = old_step.get(field)
            new_val = new_step.get(field)
            if old_val is not None and new_val is not None and int(old_val) != int(new_val):
                arrow = "↑" if int(new_val) > int(old_val) else "↓"
                changes.append(f"{arrow} {STEP_NAMES.get(stype, stype)}: {label} {old_val} → {new_val}")
    
    if not changes:
        changes.append("Thay đổi thứ tự các bước")
    
    return "; ".join(changes)


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
    user_id = AuthService.get_user_id(request)
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
    user_id = AuthService.get_user_id(request)
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
    user_id = AuthService.get_user_id(request)
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
    user_id = AuthService.get_user_id(request)
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
    user_id = AuthService.get_user_id(request)
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
        
    from app.modules.deck.models import Flashcard, DeckCollaborator
    from app.modules.auth.models import User as UserDB

    c_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
    res = await db.execute(c_stmt)
    cards = res.scalars().all()
    
    collab_stmt = select(DeckCollaborator, UserDB.username, UserDB.email).join(UserDB, DeckCollaborator.user_id == UserDB.id).where(DeckCollaborator.deck_id == deck_id)
    collab_res = await db.execute(collab_stmt)
    collaborators_list = []
    for c_row, username, email in collab_res.all():
        role = getattr(c_row, "role", "editor") or "editor"
        collaborators_list.append({"username": username or email, "role": role})
    
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
                merged_others = dict(db_c.others) if isinstance(db_c.others, dict) else {}
                merged_others.update(others)
                db_c.others = merged_others
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
    # Select text based on face
    text = ""
    target_url_col = ""
    is_custom = face not in ("front", "back")

    from app.modules.deck.models import FlashcardDeck
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == c.deck_id))
    deck = deck_res.scalar_one_or_none()

    target_lang = None
    if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
        ps = deck.practice_settings
        if not is_custom:
            cfg_key = "front_audio_config" if face == "front" else "back_audio_config"
            cfg = ps.get(cfg_key, {})
            if isinstance(cfg, dict):
                target_lang = cfg.get("lang")
        else:
            pairs = ps.get("audio_pairs", [])
            pair = next((p for p in pairs if p.get("text_col") == face), None)
            if pair:
                target_lang = pair.get("lang")

    if target_lang == "none":
        return None

    if not is_custom:
        content_col = None
        if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
            cfg_key = "front_audio_config" if face == "front" else "back_audio_config"
            cfg = deck.practice_settings.get(cfg_key, {})
            if isinstance(cfg, dict):
                content_col = cfg.get("audio_content_col")
                
        if content_col:
            if hasattr(c, content_col):
                text = getattr(c, content_col)
            elif c.others:
                text = c.others.get(content_col)
                
        if not text:
            if face == "front":
                text = c.front_audio_content or (c.others.get("front_audio_content") if c.others else None) or c.content
            else:
                text = c.back_audio_content or (c.others.get("back_audio_content") if c.others else None) or c.explanation
    else:
        if deck and deck.practice_settings and isinstance(deck.practice_settings, dict):
            pairs = deck.practice_settings.get("audio_pairs", [])
            pair = next((p for p in pairs if p.get("text_col") == face), None)
            if pair:
                content_col = pair.get("audio_content_col")
                target_url_col = pair.get("audio_url_col")
                if content_col and c.others:
                    text = c.others.get(content_col)
                if not text and c.others:
                    text = c.others.get(face)
                if not text:
                    text = getattr(c, face, None)
            elif c.others:
                text = c.others.get(face)

    if not text or not str(text).strip():
        return None
    text = str(text).strip()
        
    # Determine physical path and absolute URL based on requested deck_id and card_id
    from app.core.config import settings
    folder_path = os.path.join(settings.VOCABURN_STORAGE_DIR, str(c.deck_id), "audio")
    
    if not is_custom:
        filename = f"{c.id}_front.mp3" if face == "front" else f"{c.id}_back.mp3"
    else:
        filename = f"{c.id}_{face}.mp3"
        
    physical_path = os.path.join(folder_path, filename)
    
    # Construct relative URL
    url = f"/uploads/{c.deck_id}/audio/{filename}"
    
    # Check if we already have it generated on disk (skip if force=True)
    if os.path.exists(physical_path) and not force:
        # File is on disk, just make sure database is synchronized
        db_updated = False
        if not is_custom:
            if face == "front":
                if c.audio != url:
                    c.audio = url
                    db_updated = True
            else:
                if c.back_audio_url != url:
                    c.back_audio_url = url
                    db_updated = True
        else:
            if target_url_col:
                if not c.others:
                    c.others = {}
                if c.others.get(target_url_col) != url:
                    c.others[target_url_col] = url
                    db_updated = True
        if db_updated:
            from sqlalchemy.orm.attributes import flag_modified
            if is_custom:
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
                response = await client.post(
                     f"{sso_config.server_url.rstrip('/')}/api/tts/generate",
                     json={"text": text, "lang": target_lang},
                     timeout=20.0
                )
                if response.status_code == 200:
                    data = response.json()
                    filename_tts = data.get("filename") or os.path.basename(data.get("url"))
                    central_ref = f"central-tts://{filename_tts}"
                    
                    # Save back to database
                    if not is_custom:
                        if face == "front":
                            c.audio = central_ref
                        else:
                            c.back_audio_url = central_ref
                    else:
                        if target_url_col:
                            if not c.others:
                                c.others = {}
                            c.others[target_url_col] = central_ref
                        
                    from sqlalchemy.orm.attributes import flag_modified
                    if is_custom:
                        flag_modified(c, "others")
                    await db.commit()
                    
                    # Return the fully resolved URL for immediate UI play/preview
                    resolved_url = f"{sso_config.server_url.rstrip('/')}/static/uploads/tts/{filename_tts}"
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
            logger.info(f"[TTS LOCAL] Generating TTS locally using edge-tts/gTTS for text: '{text[:30]}...' with lang: {target_lang}")
            
            # Pass target_lang to centralized TTS request
            if sso_config.is_enabled and sso_config.server_url:
                try:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                             f"{sso_config.server_url.rstrip('/')}/api/tts/generate",
                             json={"text": text, "lang": target_lang},
                             timeout=20.0
                        )
                        if response.status_code == 200:
                            data = response.json()
                            filename_tts = data.get("filename") or os.path.basename(data.get("url"))
                            central_ref = f"central-tts://{filename_tts}"
                            if not is_custom:
                                if face == "front":
                                    c.audio = central_ref
                                else:
                                    c.back_audio_url = central_ref
                            else:
                                if target_url_col:
                                    if not c.others:
                                        c.others = {}
                                    c.others[target_url_col] = central_ref
                            from sqlalchemy.orm.attributes import flag_modified
                            if is_custom:
                                flag_modified(c, "others")
                            await db.commit()
                            resolved_url = f"{sso_config.server_url.rstrip('/')}/static/uploads/tts/{filename_tts}"
                            return resolved_url
                except Exception as sso_retry_err:
                    logger.warning(f"[TTS CENTRAL RETRY WARNING] Centralized retry failed: {sso_retry_err}")

            success = await AudioGenerator.generate_tts(text, physical_path, target_lang)
        except Exception as e:
            import traceback
            logger.error(f"Failed to generate audio locally: {e}\n{traceback.format_exc()}")
            return None
            
    if not success:
        return None
        
    # Save back to database
    if not is_custom:
        if face == "front":
            c.audio = url
        else:
            c.back_audio_url = url
    else:
        if target_url_col:
            if not c.others:
                c.others = {}
            c.others[target_url_col] = url
        
    from sqlalchemy.orm.attributes import flag_modified
    if is_custom:
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

import hashlib

@router.get("/tts/stream")
async def stream_dynamic_tts(text: str, lang: Optional[str] = None):
    if not text or not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text is required"})
        
    cleaned_text = text.strip()
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

async def _bulk_generate_deck_audio_task(deck_id: int, target_face: str, force: bool, base_url: str, card_ids: list = None, custom_source: str = None, custom_target: str = None, voice_name: str = None):
    from app.core.db import SessionLocal
    async with SessionLocal() as db:
        from app.modules.deck.models import Flashcard, FlashcardDeck
        res = await db.execute(select(Flashcard).filter(Flashcard.deck_id == deck_id))
        cards = res.scalars().all()
        if card_ids is not None:
            cards = [c for c in cards if c.id in card_ids]

        deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
        deck = deck_res.scalar_one_or_none()

        ps = deck.practice_settings if (deck and deck.practice_settings and isinstance(deck.practice_settings, dict)) else {}
        voice_mapping = ps.get("voice_mapping", {})
        
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
                text = str(text).strip()

                # Check if already has audio
                has_audio = False
                if tgt_col == "front_audio_url":
                    has_audio = bool(c.front_audio_url and c.front_audio_url.strip())
                elif tgt_col == "back_audio_url":
                    has_audio = bool(c.back_audio_url and c.back_audio_url.strip())
                elif c.others and tgt_col in c.others:
                    has_audio = bool(c.others.get(tgt_col) and str(c.others.get(tgt_col)).strip())

                if force or not has_audio:
                    task_item = {
                        "satellite_source": "vocaburn",
                        "prompt": text,
                        "callback_url": callback_url,
                        "extra_data": json.dumps({
                            "task_type": "tts",
                            "card_id": c.id,
                            "face": tgt_col,
                            "deck_id": deck_id,
                            "voice_mapping": voice_mapping
                        }),
                        "max_retries": 3
                    }
                    if face_lang and face_lang != "multi" and face_lang != "auto":
                        task_item["lang"] = face_lang.replace("gtts:", "")
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
        voice_name = payload.get("voice_name")
        
    # Detect scheme dynamically (e.g. support HTTPS behind Nginx reverse proxy)
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    netloc = request.url.netloc
    
    # Force HTTPS for any production domain to bypass Nginx configuration gaps
    if "localhost" not in netloc and "127.0.0.1" not in netloc:
        scheme = "https"
        
    base_url = f"{scheme}://{netloc}"
    
    background_tasks.add_task(_bulk_generate_deck_audio_task, deck_id, target_face, force, base_url, card_ids, source_field, target_field, voice_name)
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

@router.get("/{deck_id}/columns-overview")
async def get_deck_columns_overview(deck_id: int, db: AsyncSession = Depends(get_db)):
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import Flashcard
    res = await db.execute(select(Flashcard).where(Flashcard.deck_id == deck_id))
    cards = res.scalars().all()
    total_cards = len(cards)
    
    col_counts = {
        "front": sum(1 for c in cards if c.front and str(c.front).strip()),
        "back": sum(1 for c in cards if c.back and str(c.back).strip()),
        "front_audio_content": sum(1 for c in cards if (getattr(c, "front_audio_content", None) and str(c.front_audio_content).strip()) or (isinstance(c.others, dict) and c.others.get("front_audio_content") and str(c.others.get("front_audio_content")).strip())),
        "back_audio_content": sum(1 for c in cards if (getattr(c, "back_audio_content", None) and str(c.back_audio_content).strip()) or (isinstance(c.others, dict) and c.others.get("back_audio_content") and str(c.others.get("back_audio_content")).strip())),
        "front_audio_url": sum(1 for c in cards if (getattr(c, "front_audio_url", None) and str(c.front_audio_url).strip()) or (isinstance(c.others, dict) and (c.others.get("front_audio_url") or c.others.get("audio")) and str(c.others.get("front_audio_url") or c.others.get("audio")).strip())),
        "back_audio_url": sum(1 for c in cards if (getattr(c, "back_audio_url", None) and str(c.back_audio_url).strip()) or (isinstance(c.others, dict) and c.others.get("back_audio_url") and str(c.others.get("back_audio_url")).strip())),
        "front_img": sum(1 for c in cards if (getattr(c, "front_img", None) and str(c.front_img).strip()) or (isinstance(c.others, dict) and (c.others.get("front_img") or c.others.get("image")) and str(c.others.get("front_img") or c.others.get("image")).strip())),
        "back_img": sum(1 for c in cards if (getattr(c, "back_img", None) and str(c.back_img).strip()) or (isinstance(c.others, dict) and c.others.get("back_img") and str(c.others.get("back_img")).strip())),
    }
    
    system_cols = {"front", "back", "front_audio_url", "back_audio_url", "front_audio_content", "back_audio_content", "front_img", "back_img", "audio", "image"}
    dynamic_cols = set()
    
    for c in cards:
        if c.others and isinstance(c.others, dict):
            for k, v in c.others.items():
                if k not in ("id", "item_id", "order_in_container") and k != "other_content" and k not in system_cols:
                    dynamic_cols.add(k)
                    if k not in col_counts:
                        col_counts[k] = 0
                    if v is not None and str(v).strip():
                        col_counts[k] += 1
                        
    custom_cols = list(deck.practice_settings.get("custom_columns", [])) if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else []
    for cc in custom_cols:
        if cc not in system_cols:
            dynamic_cols.add(cc)
            if cc not in col_counts:
                col_counts[cc] = 0
                
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        for p in deck.practice_settings.get("ai_prompts", []):
            col_id = p.get("column") or p.get("id")
            if col_id and col_id not in system_cols:
                dynamic_cols.add(col_id)
                if col_id not in col_counts:
                    col_counts[col_id] = 0
        for ac in deck.practice_settings.get("audio_configs", []):
            for f in (ac.get("data_col"), ac.get("source_col"), ac.get("url_col")):
                if f and f not in system_cols:
                    dynamic_cols.add(f)
                    if f not in col_counts:
                        col_counts[f] = 0
            
    return {
        "total_cards": total_cards,
        "custom_columns": custom_cols,
        "dynamic_columns": sorted(list(dynamic_cols)),
        "column_counts": col_counts
    }

@router.post("/{deck_id}/add-column")
async def add_deck_column(request: Request, deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to edit columns in this deck"})

    col_name = payload.get("column_name", "").strip().lower().replace(" ", "_")
    if not col_name:
        return JSONResponse(status_code=400, content={"error": "Tên cột không hợp lệ"})
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if not deck.practice_settings or not isinstance(deck.practice_settings, dict):
        deck.practice_settings = {}
        
    custom_cols = list(deck.practice_settings.get("custom_columns", []))
    if col_name in custom_cols or col_name in ["front", "back"]:
        return JSONResponse(status_code=400, content={"error": "Cột này đã tồn tại trong bộ thẻ"})
        
    custom_cols.append(col_name)
    deck.practice_settings["custom_columns"] = custom_cols
    
    order = list(deck.practice_settings.get("column_order", []))
    if col_name not in order:
        order.append(col_name)
        deck.practice_settings["column_order"] = order
        
    flag_modified(deck, "practice_settings")
    await db.commit()
    return {"status": "ok", "column_name": col_name}

@router.post("/{deck_id}/rename-column")
async def rename_deck_column(request: Request, deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to rename columns in this deck"})

    old_name = payload.get("old_name", "").strip()
    new_name = payload.get("new_name", "").strip().lower().replace(" ", "_")
    if not old_name or not new_name:
        return JSONResponse(status_code=400, content={"error": "Tên cột cũ và mới không được để trống"})
    if old_name == new_name:
        return {"status": "ok"}
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        custom_cols = list(deck.practice_settings.get("custom_columns", []))
        if old_name in custom_cols:
            idx = custom_cols.index(old_name)
            custom_cols[idx] = new_name
            deck.practice_settings["custom_columns"] = custom_cols
            
        order = list(deck.practice_settings.get("column_order", []))
        if old_name in order:
            idx = order.index(old_name)
            order[idx] = new_name
            deck.practice_settings["column_order"] = order
            
        prompts = deck.practice_settings.get("ai_prompts", [])
        for p in prompts:
            if p.get("column") == old_name:
                p["column"] = new_name
                p["id"] = new_name
                p["title"] = new_name.upper().replace("_", " ")
        deck.practice_settings["ai_prompts"] = prompts
        
        audio_configs = deck.practice_settings.get("audio_configs", [])
        for ac in audio_configs:
            if ac.get("source_col") == old_name:
                ac["source_col"] = new_name
            if ac.get("url_col") == old_name:
                ac["url_col"] = new_name
        deck.practice_settings["audio_configs"] = audio_configs
        
        flag_modified(deck, "practice_settings")
        
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
async def delete_deck_column(request: Request, deck_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.interface import DeckInterface
    has_permission = await DeckInterface.check_user_deck_permission(db, deck_id, user_id, allow_collaborator=True)
    if not has_permission:
        return JSONResponse(status_code=403, content={"error": "No permission to delete columns in this deck"})

    col_name = payload.get("column_name", "").strip()
    if not col_name:
        return JSONResponse(status_code=400, content={"error": "column_name is required"})
        
    if col_name in ["front", "back"]:
        return JSONResponse(status_code=400, content={"error": "Không thể xóa cột mặc định cơ bản (front/back)"})
        
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from sqlalchemy.orm.attributes import flag_modified
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        custom_cols = list(deck.practice_settings.get("custom_columns", []))
        if col_name in custom_cols:
            custom_cols.remove(col_name)
            deck.practice_settings["custom_columns"] = custom_cols
            
        order = list(deck.practice_settings.get("column_order", []))
        if col_name in order:
            order.remove(col_name)
            deck.practice_settings["column_order"] = order
            
        prompts = deck.practice_settings.get("ai_prompts", [])
        deck.practice_settings["ai_prompts"] = [p for p in prompts if p.get("column") != col_name and p.get("id") != col_name]
        
        audio_configs = deck.practice_settings.get("audio_configs", [])
        deck.practice_settings["audio_configs"] = [ac for ac in audio_configs if ac.get("source_col") != col_name and ac.get("url_col") != col_name]
        
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
