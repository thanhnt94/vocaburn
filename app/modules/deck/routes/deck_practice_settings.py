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

from app.modules.deck.services.fsrs_service import build_fsrs_card
from app.modules.deck.utils import migrate_practice_settings, resolve_effective_study_settings, STUDY_SETTINGS_KEYS
from app.modules.auth.services.user_settings_service import UserSettingsService

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
        "setting_origin": study_resolved["setting_origin"],
        "is_study_customized": study_resolved["is_customized"],
        "disabled_modes": (deck.practice_settings or {}).get("disabled_modes", []),
        "sub_lesson_grouping": (deck.practice_settings or {}).get("sub_lesson_grouping", {})
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
    has_deck_level_change = (
        is_creator
        or "sub_lesson_grouping" in payload
        or "disabled_modes" in payload
        or (isinstance(settings, dict) and any(k in settings for k in ("sub_lesson_grouping", "disabled_modes", "study_defaults")))
    )
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    if has_deck_level_change:
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
        merged = dict(deck.practice_settings) if isinstance(deck.practice_settings, dict) else {}
        
        if isinstance(settings, dict):
            merged.update(settings)
            # Deep merge study_defaults if both present
            if "study_defaults" in deck.practice_settings and isinstance(deck.practice_settings["study_defaults"], dict) and "study_defaults" in settings and isinstance(settings["study_defaults"], dict):
                merged_sd = dict(deck.practice_settings["study_defaults"])
                merged_sd.update(settings["study_defaults"])
                merged["study_defaults"] = merged_sd
            if "sub_lesson_grouping" in settings:
                merged["sub_lesson_grouping"] = settings["sub_lesson_grouping"]
            if "disabled_modes" in settings:
                merged["disabled_modes"] = settings["disabled_modes"]

        if "sub_lesson_grouping" in payload:
            merged["sub_lesson_grouping"] = payload["sub_lesson_grouping"]
        if "disabled_modes" in payload:
            merged["disabled_modes"] = payload["disabled_modes"]

        deck.practice_settings = merged
        flag_modified(deck, "practice_settings")
        
        # When creator updates deck study defaults, clear any conflicting overrides in their UserDeckSettings
        from app.modules.deck.utils import STUDY_SETTINGS_KEYS
        user_sett_res = await db.execute(
            select(UserDeckSettings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        creator_user_sett = user_sett_res.scalar_one_or_none()
        if creator_user_sett and isinstance(creator_user_sett.settings, dict):
            modified_user_sett = False
            for k in STUDY_SETTINGS_KEYS:
                if k in creator_user_sett.settings:
                    creator_user_sett.settings.pop(k, None)
                    modified_user_sett = True
            if "study_settings" in creator_user_sett.settings and isinstance(creator_user_sett.settings["study_settings"], dict):
                for k in STUDY_SETTINGS_KEYS:
                    if k in creator_user_sett.settings["study_settings"]:
                        creator_user_sett.settings["study_settings"].pop(k, None)
                        modified_user_sett = True
            if modified_user_sett:
                flag_modified(creator_user_sett, "settings")
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

        from app.modules.deck.utils import STUDY_SETTINGS_KEYS

        if reset_study_defaults:
            if user_sett and isinstance(user_sett.settings, dict):
                for k in STUDY_SETTINGS_KEYS:
                    user_sett.settings.pop(k, None)
                if "study_settings" in user_sett.settings and isinstance(user_sett.settings["study_settings"], dict):
                    for k in STUDY_SETTINGS_KEYS:
                        user_sett.settings["study_settings"].pop(k, None)
                user_sett.settings.pop("_origin", None)
                flag_modified(user_sett, "settings")
                await db.commit()
            
            study_resolved = resolve_effective_study_settings(
                deck.practice_settings,
                user_sett.settings if user_sett else None
            )
            return {
                "status": "ok",
                "message": "Reset to creator defaults",
                "study_defaults": study_resolved["creator_study_defaults"],
                "creator_study_defaults": study_resolved["creator_study_defaults"],
                "user_study_settings": study_resolved["user_study_settings"],
                "effective_study_settings": study_resolved["effective_study_settings"],
                "setting_origin": study_resolved["setting_origin"],
                "is_study_customized": study_resolved["is_customized"]
            }

        if not user_sett:
            cleaned_settings = dict(settings) if isinstance(settings, dict) else {}
            if "study_settings" in cleaned_settings and isinstance(cleaned_settings["study_settings"], dict):
                for k, v in cleaned_settings["study_settings"].items():
                    if k not in cleaned_settings:
                        cleaned_settings[k] = v
            if any(k in cleaned_settings for k in STUDY_SETTINGS_KEYS):
                cleaned_settings["_origin"] = "deck_override"
            user_sett = UserDeckSettings(user_id=user_id, deck_id=deck_id, settings=cleaned_settings)
            db.add(user_sett)
        elif not settings and payload.get("clear_all", False):
            user_sett.settings = {}
            flag_modified(user_sett, "settings")
        else:
            merged = dict(user_sett.settings) if isinstance(user_sett.settings, dict) else {}
            if isinstance(settings, dict):
                if "study_settings" in settings and isinstance(settings["study_settings"], dict):
                    for k, v in settings["study_settings"].items():
                        merged[k] = v
                merged.update(settings)
                if "study_settings" in merged and isinstance(merged["study_settings"], dict):
                    for k in STUDY_SETTINGS_KEYS:
                        if k in settings:
                            merged["study_settings"][k] = settings[k]
                if any(k in settings for k in STUDY_SETTINGS_KEYS):
                    merged["_origin"] = "deck_override"
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

    eff_user_sett = user_sett.settings if ('user_sett' in locals() and user_sett and isinstance(user_sett.settings, dict)) else (creator_user_sett.settings if ('creator_user_sett' in locals() and creator_user_sett and isinstance(creator_user_sett.settings, dict)) else None)
    study_resolved = resolve_effective_study_settings(
        deck.practice_settings,
        eff_user_sett
    )

    return {
        "status": "ok",
        "study_defaults": study_resolved["creator_study_defaults"],
        "creator_study_defaults": study_resolved["creator_study_defaults"],
        "user_study_settings": study_resolved["user_study_settings"],
        "effective_study_settings": study_resolved["effective_study_settings"],
        "setting_origin": study_resolved["setting_origin"],
        "is_study_customized": study_resolved["is_customized"]
    }


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

