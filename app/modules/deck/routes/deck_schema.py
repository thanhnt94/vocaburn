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
from app.modules.deck.utils import clean_col_name, reconcile_column_name
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
    
    from app.modules.deck.utils import clean_col_name
    system_cols = {"front", "back", "front_audio_url", "back_audio_url", "front_audio_content", "back_audio_content", "front_img", "back_img", "audio", "image"}
    dynamic_cols = set()
    
    for c in cards:
        if c.others and isinstance(c.others, dict):
            for k, v in c.others.items():
                k_clean = clean_col_name(k)
                if (
                    k_clean 
                    and not k_clean.startswith("_") 
                    and not k_clean.startswith("[") 
                    and k_clean not in ("id", "item_id", "order_in_container", "other_content", "content", "explanation")
                    and k_clean not in system_cols
                ):
                    dynamic_cols.add(k_clean)
                    if k_clean not in col_counts:
                        col_counts[k_clean] = 0
                    if v is not None and str(v).strip():
                        col_counts[k_clean] += 1
                        
    custom_cols = [clean_col_name(c) for c in deck.practice_settings.get("custom_columns", [])] if (deck.practice_settings and isinstance(deck.practice_settings, dict)) else []
    # Keep only custom_cols that actually exist in dynamic_cols
    custom_cols = [c for c in custom_cols if c in dynamic_cols]
    
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        for p in deck.practice_settings.get("ai_prompts", []):
            col_id = clean_col_name(p.get("column") or p.get("id"))
            if col_id and col_id in dynamic_cols:
                if col_id not in col_counts:
                    col_counts[col_id] = 0
        for ac in deck.practice_settings.get("audio_configs", []):
            for f in (ac.get("data_col"), ac.get("source_col"), ac.get("url_col")):
                f_clean = clean_col_name(f)
                if f_clean and f_clean in dynamic_cols:
                    if f_clean not in col_counts:
                        col_counts[f_clean] = 0
            
    return {
        "total_cards": total_cards,
        "custom_columns": custom_cols,
        "dynamic_columns": sorted(list(dynamic_cols)),
        "column_counts": col_counts
    }

@router.get("/{deck_id}/sub-lessons")
async def get_deck_sub_lessons(
    request: Request,
    deck_id: int,
    column: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import Flashcard, UserCardMastery
    import re
    
    # 1. Fetch lightweight cards (id, others, question_type) instead of heavy ORM objects
    res = await db.execute(
        select(Flashcard.id, Flashcard.others, Flashcard.question_type)
        .where(Flashcard.deck_id == deck_id)
    )
    raw_cards = res.all()
    total_cards = len(raw_cards)
    
    # 2. Extract practice_settings configuration
    practice_settings = deck.practice_settings or {}
    grouping_cfg = practice_settings.get("sub_lesson_grouping", {})
    is_configured_enabled = bool(grouping_cfg.get("enabled", False))
    configured_column = grouping_cfg.get("column")
    
    # Category columns explicitly designated by deck creator
    raw_cat_cols = practice_settings.get("category_columns") or grouping_cfg.get("category_columns") or []
    if isinstance(raw_cat_cols, str):
        raw_cat_cols = [raw_cat_cols]
    category_columns = [clean_col_name(c) for c in raw_cat_cols if clean_col_name(c)]

    # Query user personal preference for this deck
    user_pref_col = None
    if user_id:
        from app.modules.deck.models import UserDeckSettings
        u_res = await db.execute(
            select(UserDeckSettings.settings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        u_sett = u_res.scalar_one_or_none()
        if u_sett and isinstance(u_sett, dict):
            raw_pref = u_sett.get("sub_lesson_column") or u_sett.get("selected_category_column")
            if raw_pref:
                user_pref_col = clean_col_name(str(raw_pref))

    # 3. Discover all candidate columns in this deck
    excluded_cols = {
        "id", "item_id", "order_in_container", "_formulas", "_formula",
        "front_audio_url", "back_audio_url", "front_audio_content", "back_audio_content",
        "meaning_audio_url", "meaning_audio_content", "podcast_audio_url", "podcast_audio_content",
        "front_img", "back_img"
    }
    
    col_distinct_map = {}
    for c_id, c_others, c_qtype in raw_cards:
        if c_others and isinstance(c_others, dict):
            for k, v in c_others.items():
                k_clean = clean_col_name(k)
                if k_clean and k_clean not in excluded_cols and not k_clean.startswith("_") and not k_clean.startswith("["):
                    if k_clean not in col_distinct_map:
                        col_distinct_map[k_clean] = set()
                    val_str = str(v).strip() if v is not None else ""
                    if val_str:
                        col_distinct_map[k_clean].add(val_str)

    # Filter candidate columns:
    # If creator explicitly configured category_columns, STRICTLY respect that whitelist!
    if category_columns:
        allowed_set = set(category_columns)
        if configured_column:
            allowed_set.add(clean_col_name(configured_column))
        col_distinct_map = {k: v for k, v in col_distinct_map.items() if k in allowed_set}
    else:
        # Smart noise reduction for unconfigured decks:
        # Exclude long text columns (translations, notes, sentences, nuances)
        noisy_keywords = (
            "audio", "dịch", "dich", "ví_dụ", "vi_du", "chú_ý", "chu_y",
            "sắc_thái", "sac_thai", "lưu_ý", "luu_y", "bản_chất", "ban_chat",
            "cách_kết_hợp", "cach_ket_hop", "mã", "ma_", "stt"
        )
        filtered_map = {}
        for k, v in col_distinct_map.items():
            k_lower = k.lower()
            if any(nw in k_lower for nw in noisy_keywords):
                continue
            # If all cards have distinct values, it's not a group/category
            if total_cards > 10 and len(v) >= total_cards * 0.9:
                continue
            # Calculate average length of distinct values
            avg_len = sum(len(x) for x in v) / max(len(v), 1)
            if avg_len > 35:
                continue
            filtered_map[k] = v
        col_distinct_map = filtered_map

    # Build candidate columns list (prioritizing educational grouping columns)
    def column_priority_key(col_key: str):
        col_lower = col_key.lower().replace(" ", "_").replace("-", "_")
        high_priority_keywords = [
            "unit", "lesson", "chapter", "bai", "bài", "nhom", "nhóm", "chuong", "chương",
            "topic", "chu_de", "chủ đề", "category", "danh_muc", "level", "cap_do", "cấp độ",
            "part_of_speech", "pos", "loai_tu", "loại từ", "type"
        ]
        for idx, kw in enumerate(high_priority_keywords):
            if kw in col_lower:
                return (0, idx, col_lower)
        return (1, 0, col_lower)

    available_columns = []
    for col_key, distinct_vals in sorted(col_distinct_map.items()):
        val_count = len(distinct_vals)
        clean_label = col_key.replace("_", " ").title()
        sample_preview = sorted(list(distinct_vals))[:4]
        available_columns.append({
            "column": col_key,
            "label": clean_label,
            "distinct_count": val_count,
            "sample_values": sample_preview
        })
            
    # Also add question_type if deck has multiple question types
    q_types = set(str(c_qtype).strip() for _, _, c_qtype in raw_cards if c_qtype)
    if len(q_types) > 1 and (not category_columns or "question_type" in category_columns):
        available_columns.append({
            "column": "question_type",
            "label": "Question Type",
            "distinct_count": len(q_types),
            "sample_values": sorted(list(q_types))[:4]
        })

    # Sort columns by educational priority key
    available_columns.sort(key=lambda x: column_priority_key(x["column"]))

    valid_col_names = set(c["column"] for c in available_columns)

    # Active column resolution:
    # 1. Explicit query parameter ?column=...
    # 2. Learner's personal remembered preference (user_pref_col) IF valid
    # 3. Creator's configured column IF valid
    # 4. First available candidate column
    if column and clean_col_name(column) in valid_col_names:
        active_col = clean_col_name(column)
    elif user_pref_col and user_pref_col in valid_col_names:
        active_col = user_pref_col
    elif configured_column and clean_col_name(configured_column) in valid_col_names:
        active_col = clean_col_name(configured_column)
    elif is_configured_enabled and available_columns:
        active_col = available_columns[0]["column"]
    elif available_columns and column:
        active_col = available_columns[0]["column"]
    else:
        active_col = None

    # 4. If we have an active column, compute groups & mastery progress
    groups = []
    if active_col:
        mastery_map = {}
        if user_id and total_cards > 0:
            card_id_subq = select(Flashcard.id).where(Flashcard.deck_id == deck_id)
            m_res = await db.execute(
                select(
                    UserCardMastery.card_id,
                    UserCardMastery.state,
                    UserCardMastery.last_review,
                    UserCardMastery.box_level,
                    UserCardMastery.due
                ).where(
                    UserCardMastery.user_id == user_id,
                    UserCardMastery.card_id.in_(card_id_subq)
                )
            )
            for m_row in m_res.all():
                mastery_map[m_row[0]] = {
                    "state": m_row[1],
                    "last_review": m_row[2],
                    "box_level": m_row[3],
                    "due": m_row[4]
                }

        now_utc = datetime.utcnow()
        group_cards_map = {}

        for c_id, c_others, c_qtype in raw_cards:
            c_val = ""
            if c_others and isinstance(c_others, dict):
                c_val = str(c_others.get(active_col, "") or "").strip()
            elif active_col == "question_type":
                c_val = str(c_qtype or "").strip()
                
            group_key = c_val if c_val else "__empty__"
            if group_key not in group_cards_map:
                group_cards_map[group_key] = []
            group_cards_map[group_key].append(c_id)

        def natural_sort_key(s):
            return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

        sorted_keys = sorted(
            [k for k in group_cards_map.keys() if k != "__empty__"],
            key=natural_sort_key
        )
        if "__empty__" in group_cards_map:
            sorted_keys.append("__empty__")

        for g_key in sorted_keys:
            g_cards = group_cards_map[g_key]
            g_total = len(g_cards)
            
            mastered_cnt = 0
            learning_cnt = 0
            new_cnt = 0
            due_cnt = 0
            
            for gc_id in g_cards:
                m = mastery_map.get(gc_id)
                if not m or (m["state"] == 0 and not m["last_review"]):
                    new_cnt += 1
                elif m["state"] == 2 or m["box_level"] == 5:
                    mastered_cnt += 1
                else:
                    learning_cnt += 1
                    
                if m and m["due"] and m["due"] <= now_utc:
                    due_cnt += 1

            pct = round((mastered_cnt / g_total) * 100) if g_total > 0 else 0
            display_name = g_key if g_key != "__empty__" else "(Uncategorized)"
            
            groups.append({
                "value": g_key,
                "label": display_name,
                "total_cards": g_total,
                "mastered_count": mastered_cnt,
                "learning_count": learning_cnt,
                "new_count": new_cnt,
                "due_count": due_cnt,
                "mastered_pct": pct
            })

    return {
        "enabled": is_configured_enabled,
        "is_configured": is_configured_enabled,
        "configured_column": configured_column,
        "category_columns": category_columns,
        "active_column": active_col,
        "active_column_label": active_col.replace("_", " ").title() if active_col else None,
        "total_cards": total_cards,
        "total_groups": len(groups),
        "groups": groups,
        "available_columns": available_columns
    }

@router.post("/{deck_id}/sub-lessons/preference")
async def save_sub_lessons_user_preference(
    request: Request,
    deck_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    col = payload.get("column")
    if col:
        col = clean_col_name(col)

    from app.modules.deck.models import UserDeckSettings
    from sqlalchemy.orm.attributes import flag_modified

    u_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = u_res.scalar_one_or_none()
    if not user_sett:
        user_sett = UserDeckSettings(
            user_id=user_id,
            deck_id=deck_id,
            settings={"sub_lesson_column": col}
        )
        db.add(user_sett)
    else:
        current_settings = dict(user_sett.settings) if isinstance(user_sett.settings, dict) else {}
        current_settings["sub_lesson_column"] = col
        user_sett.settings = current_settings
        flag_modified(user_sett, "settings")

    await db.commit()
    return {"status": "ok", "sub_lesson_column": col}

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

