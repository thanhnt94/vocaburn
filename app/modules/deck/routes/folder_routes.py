import random
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, case, or_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.deck.models import Folder, FolderDeck, FlashcardDeck, Flashcard, UserCardMastery
from app.modules.deck.routes.play import resolve_play_cards
from app.modules.deck.utils import fix_static_urls
from app.modules.deck.services.fsrs_service import estimate_intervals
from app.modules.deck.services.mcq_engine import MCQEngine

router = APIRouter(prefix="/folders", tags=["Folders"])
folder_play_router = APIRouter(prefix="/folder", tags=["Folders"])


class FolderCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    color: Optional[str] = "orange"
    deck_ids: Optional[List[int]] = []


class FolderUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    color: Optional[str] = None
    deck_ids: Optional[List[int]] = None


class AddDecksSchema(BaseModel):
    deck_ids: List[int]


# ══════════════════════════════════════════════════════════════════════════════
# FOLDER CRUD ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def get_user_folders(request: Request, db: AsyncSession = Depends(get_db)):
    """List all folders belonging to the authenticated user with aggregated metrics."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fetch user's folders
    stmt = (
        select(Folder)
        .where(Folder.user_id == user_id)
        .options(selectinload(Folder.folder_decks))
        .order_by(Folder.created_at.desc())
    )
    res = await db.execute(stmt)
    folders = res.scalars().all()

    if not folders:
        return []

    # Collect all deck IDs across all user folders
    all_deck_ids = set()
    folder_deck_map = {}
    for f in folders:
        d_ids = [fd.deck_id for fd in f.folder_decks]
        folder_deck_map[f.id] = d_ids
        all_deck_ids.update(d_ids)

    # Bulk query cards count per deck
    cards_per_deck = {}
    if all_deck_ids:
        card_cnt_stmt = (
            select(Flashcard.deck_id, func.count(Flashcard.id))
            .where(Flashcard.deck_id.in_(all_deck_ids))
            .group_by(Flashcard.deck_id)
        )
        card_cnt_res = await db.execute(card_cnt_stmt)
        cards_per_deck = {row[0]: row[1] for row in card_cnt_res.all()}

    # Bulk query mastery per deck for this user
    mastery_per_deck = {}
    if all_deck_ids:
        mastery_stmt = (
            select(
                Flashcard.deck_id,
                func.count(UserCardMastery.id).label("learned"),
                func.sum(case((UserCardMastery.box_level >= 4, 1), else_=0)).label("mastered")
            )
            .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
            .where(
                UserCardMastery.user_id == user_id,
                Flashcard.deck_id.in_(all_deck_ids),
                or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
            )
            .group_by(Flashcard.deck_id)
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_per_deck = {row[0]: {"learned": row[1] or 0, "mastered": row[2] or 0} for row in mastery_res.all()}

    # Assemble response
    result = []
    for f in folders:
        d_ids = folder_deck_map.get(f.id, [])
        total_cards = sum(cards_per_deck.get(d_id, 0) for d_id in d_ids)
        learned_count = sum(mastery_per_deck.get(d_id, {}).get("learned", 0) for d_id in d_ids)
        mastered_count = sum(mastery_per_deck.get(d_id, {}).get("mastered", 0) for d_id in d_ids)
        pct = round((learned_count / total_cards) * 100) if total_cards > 0 else 0

        result.append({
            "id": f.id,
            "title": f.title,
            "description": f.description,
            "cover_image": fix_static_urls(f.cover_image),
            "color": f.color or "orange",
            "decks_count": len(d_ids),
            "deck_ids": d_ids,
            "total_cards": total_cards,
            "cards_count": total_cards,
            "learned_count": learned_count,
            "mastered_count": mastered_count,
            "progress_percent": pct,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        })

    return result


@router.post("")
async def create_folder(payload: FolderCreateSchema, request: Request, db: AsyncSession = Depends(get_db)):
    """Create a new folder and associate initial decks."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Folder title cannot be empty")

    new_folder = Folder(
        user_id=user_id,
        title=title,
        description=payload.description.strip() if payload.description else None,
        cover_image=payload.cover_image,
        color=payload.color or "orange",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_folder)
    await db.flush()

    if payload.deck_ids:
        # Validate that deck IDs exist
        valid_decks_stmt = select(FlashcardDeck.id).where(FlashcardDeck.id.in_(payload.deck_ids))
        valid_res = await db.execute(valid_decks_stmt)
        valid_ids = set(valid_res.scalars().all())

        for idx, d_id in enumerate(payload.deck_ids):
            if d_id in valid_ids:
                db.add(FolderDeck(
                    folder_id=new_folder.id,
                    deck_id=d_id,
                    order_index=idx,
                    added_at=datetime.utcnow()
                ))

    await db.commit()
    await db.refresh(new_folder)

    return {
        "id": new_folder.id,
        "title": new_folder.title,
        "description": new_folder.description,
        "cover_image": fix_static_urls(new_folder.cover_image),
        "color": new_folder.color,
        "decks_count": len(payload.deck_ids or []),
        "deck_ids": payload.deck_ids or [],
        "created_at": new_folder.created_at.isoformat() if new_folder.created_at else None
    }


@router.get("/{folder_id}")
async def get_folder_details(folder_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get single folder with detailed list of member decks."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = (
        select(Folder)
        .where(Folder.id == folder_id)
        .options(selectinload(Folder.folder_decks))
    )
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder.user_id != user_id and not folder.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    deck_ids = [fd.deck_id for fd in folder.folder_decks]

    member_decks = []
    total_cards = 0
    total_learned = 0
    total_mastered = 0

    if deck_ids:
        decks_stmt = (
            select(
                FlashcardDeck,
                select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
            )
            .where(FlashcardDeck.id.in_(deck_ids))
            .options(selectinload(FlashcardDeck.tags))
        )
        decks_res = await db.execute(decks_stmt)

        mastery_stmt = (
            select(
                Flashcard.deck_id,
                func.count(UserCardMastery.id).label("learned"),
                func.sum(case((UserCardMastery.box_level >= 4, 1), else_=0)).label("mastered")
            )
            .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
            .where(
                UserCardMastery.user_id == user_id,
                Flashcard.deck_id.in_(deck_ids),
                or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
            )
            .group_by(Flashcard.deck_id)
        )
        mastery_res = await db.execute(mastery_stmt)
        mastery_map = {row[0]: {"learned": row[1] or 0, "mastered": row[2] or 0} for row in mastery_res.all()}

        # Keep original order from folder_decks
        deck_obj_map = {row[0].id: (row[0], row[1]) for row in decks_res.all()}
        for d_id in deck_ids:
            if d_id in deck_obj_map:
                d, c_count = deck_obj_map[d_id]
                c_cnt = c_count or 0
                prog = mastery_map.get(d.id, {"learned": 0, "mastered": 0})
                learned = prog["learned"]
                mastered = prog["mastered"]
                pct = round((learned / c_cnt) * 100) if c_cnt > 0 else 0

                total_cards += c_cnt
                total_learned += learned
                total_mastered += mastered

                member_decks.append({
                    "id": d.id,
                    "title": d.title,
                    "description": d.description,
                    "cover_image": fix_static_urls(d.cover_image),
                    "cards_count": c_cnt,
                    "questions_count": c_cnt,
                    "learned_count": learned,
                    "mastered_count": mastered,
                    "progress_percent": pct,
                    "tags": [t.name for t in d.tags] if d.tags else []
                })

    overall_pct = round((total_learned / total_cards) * 100) if total_cards > 0 else 0

    return {
        "id": folder.id,
        "title": folder.title,
        "description": folder.description,
        "cover_image": fix_static_urls(folder.cover_image),
        "color": folder.color or "orange",
        "decks_count": len(member_decks),
        "deck_ids": deck_ids,
        "total_cards": total_cards,
        "learned_count": total_learned,
        "mastered_count": total_mastered,
        "progress_percent": overall_pct,
        "decks": member_decks,
        "created_at": folder.created_at.isoformat() if folder.created_at else None,
        "updated_at": folder.updated_at.isoformat() if folder.updated_at else None
    }


@router.put("/{folder_id}")
async def update_folder(folder_id: int, payload: FolderUpdateSchema, request: Request, db: AsyncSession = Depends(get_db)):
    """Update folder metadata and member decks."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(Folder).where(Folder.id == folder_id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Folder title cannot be empty")
        folder.title = title

    if payload.description is not None:
        folder.description = payload.description.strip() if payload.description else None

    if payload.cover_image is not None:
        folder.cover_image = payload.cover_image

    if payload.color is not None:
        folder.color = payload.color

    folder.updated_at = datetime.utcnow()

    # Sync member decks if provided
    if payload.deck_ids is not None:
        await db.execute(delete(FolderDeck).where(FolderDeck.folder_id == folder.id))
        if payload.deck_ids:
            valid_decks_stmt = select(FlashcardDeck.id).where(FlashcardDeck.id.in_(payload.deck_ids))
            valid_res = await db.execute(valid_decks_stmt)
            valid_ids = set(valid_res.scalars().all())

            for idx, d_id in enumerate(payload.deck_ids):
                if d_id in valid_ids:
                    db.add(FolderDeck(
                        folder_id=folder.id,
                        deck_id=d_id,
                        order_index=idx,
                        added_at=datetime.utcnow()
                    ))

    await db.commit()
    await db.refresh(folder)

    return {
        "status": "success",
        "id": folder.id,
        "title": folder.title,
        "description": folder.description,
        "cover_image": fix_static_urls(folder.cover_image),
        "color": folder.color,
        "updated_at": folder.updated_at.isoformat() if folder.updated_at else None
    }


@router.delete("/{folder_id}")
async def delete_folder(folder_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete a folder. Underlying decks and cards remain completely untouched."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(Folder).where(Folder.id == folder_id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(folder)
    await db.commit()

    return {"status": "success", "message": f"Folder '{folder.title}' deleted"}


@router.post("/{folder_id}/decks")
async def add_decks_to_folder(folder_id: int, payload: AddDecksSchema, request: Request, db: AsyncSession = Depends(get_db)):
    """Add decks to an existing folder."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(Folder).where(Folder.id == folder_id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get existing deck IDs in folder
    existing_stmt = select(FolderDeck.deck_id).where(FolderDeck.folder_id == folder_id)
    existing_res = await db.execute(existing_stmt)
    existing_ids = set(existing_res.scalars().all())

    # Get current max order_index
    max_idx_stmt = select(func.coalesce(func.max(FolderDeck.order_index), 0)).where(FolderDeck.folder_id == folder_id)
    max_idx = (await db.execute(max_idx_stmt)).scalar() or 0

    added_count = 0
    for d_id in payload.deck_ids:
        if d_id not in existing_ids:
            max_idx += 1
            db.add(FolderDeck(
                folder_id=folder_id,
                deck_id=d_id,
                order_index=max_idx,
                added_at=datetime.utcnow()
            ))
            existing_ids.add(d_id)
            added_count += 1

    await db.commit()
    return {"status": "success", "added_count": added_count}


@router.delete("/{folder_id}/decks/{deck_id}")
async def remove_deck_from_folder(folder_id: int, deck_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Remove a deck from a folder. Deck itself remains intact."""
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(Folder).where(Folder.id == folder_id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.execute(delete(FolderDeck).where(FolderDeck.folder_id == folder_id, FolderDeck.deck_id == deck_id))
    await db.commit()

    return {"status": "success", "message": "Deck removed from folder"}


# ══════════════════════════════════════════════════════════════════════════════
# FOLDER MULTI-DECK PLAY & PRACTICE DATA ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@folder_play_router.get("/{folder_id}/play-data")
async def get_folder_play_data(
    folder_id: int,
    request: Request,
    mode: Optional[str] = None,
    shuffle: Optional[bool] = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Combined study data across all member decks of a folder.
    Supports FSRS, Flip, Review, New, MCQ, Typing, Listening with full shuffle support.
    """
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = (
        select(Folder)
        .where(Folder.id == folder_id)
        .options(selectinload(Folder.folder_decks))
    )
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder.user_id != user_id and not folder.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    deck_ids = [fd.deck_id for fd in folder.folder_decks]
    if not deck_ids:
        return {
            "id": f"folder_{folder.id}",
            "folder_id": folder.id,
            "title": folder.title,
            "description": folder.description,
            "cover_image": fix_static_urls(folder.cover_image),
            "is_folder": True,
            "total_decks": 0,
            "cards": [],
            "questions": [],
            "user_total_xp": 0,
            "user_today_xp": 0,
            "user_today_time": 0,
            "user_all_time_time": 0
        }

    # Query all decks and cards
    decks_stmt = (
        select(FlashcardDeck)
        .where(FlashcardDeck.id.in_(deck_ids))
        .options(selectinload(FlashcardDeck.cards))
    )
    decks_res = await db.execute(decks_stmt)
    decks = decks_res.scalars().all()
    deck_map = {d.id: d for d in decks}

    # Pool all cards across all member decks in folder_decks sequence
    all_cards = []
    for d_id in deck_ids:
        deck_obj = deck_map.get(d_id)
        if deck_obj and deck_obj.cards:
            for card in deck_obj.cards:
                all_cards.append(card)

    if not all_cards:
        return {
            "id": f"folder_{folder.id}",
            "folder_id": folder.id,
            "title": folder.title,
            "description": folder.description,
            "cover_image": fix_static_urls(folder.cover_image),
            "is_folder": True,
            "total_decks": len(deck_ids),
            "cards": [],
            "questions": [],
            "user_total_xp": 0,
            "user_today_xp": 0,
            "user_today_time": 0,
            "user_all_time_time": 0
        }

    # Fetch UserCardMastery for all cards
    card_ids = [c.id for c in all_cards]
    mastery_stmt = select(UserCardMastery).where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.card_id.in_(card_ids)
    )
    mastery_res = await db.execute(mastery_stmt)
    mastery_map = {m.card_id: m for m in mastery_res.scalars().all()}

    # Fetch user stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    from app.modules.gamification.models import XPTransaction
    from app.modules.deck.models import UserAnswer, DeckAttempt
    xp_stmt = select(func.sum(XPTransaction.amount)).where(
        XPTransaction.user_id == user_id,
        XPTransaction.created_at >= today_start
    )
    user_today_xp = (await db.execute(xp_stmt)).scalar() or 0

    total_xp_stmt = select(func.sum(XPTransaction.amount)).where(XPTransaction.user_id == user_id)
    user_total_xp = (await db.execute(total_xp_stmt)).scalar() or 0

    time_stmt = (
        select(func.sum(UserAnswer.active_time))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(
            DeckAttempt.user_id == user_id,
            UserAnswer.created_at >= today_start
        )
    )
    user_today_time = (await db.execute(time_stmt)).scalar() or 0.0

    cards_list = []
    for i, c in enumerate(all_cards):
        m = mastery_map.get(c.id)
        state_val = m.state if m else 0
        box_lvl = m.box_level if m else 1
        is_ign = m.is_ignored if m else False
        is_star = m.is_starred if m else False
        due_str = m.due.isoformat() if (m and m.due) else None

        # Filter out ignored cards
        if is_ign:
            continue

        # FSRS intervals estimation
        intervals = estimate_intervals(m)

        cards_list.append({
            "id": c.id,
            "deck_id": c.deck_id,
            "original_index": i + 1,
            "content": c.content,
            "explanation": c.explanation,
            "front_audio_content": c.front_audio_content,
            "back_audio_content": c.back_audio_content,
            "front_audio_url": c.front_audio_url,
            "back_audio_url": c.back_audio_url,
            "front_img": c.front_img,
            "back_img": c.back_img,
            "image": fix_static_urls(c.back_img),
            "audio": fix_static_urls(c.front_audio_url),
            "others": fix_static_urls(c.others),
            "state": state_val,
            "box_level": box_lvl,
            "due": due_str,
            "is_starred": is_star,
            "intervals": intervals
        })

    # Resolve static URLs
    await resolve_play_cards(cards_list, db)

    # Mode filtering
    if mode == "new":
        cards_list = [c for c in cards_list if c.get("state") == 0]
    elif mode == "review":
        cards_list = [c for c in cards_list if c.get("state") in (1, 2, 3)]

    is_practice = mode in ("mcq", "typing", "listening")

    # Shuffle cards / practice exercises if requested or in practice mode
    if shuffle or is_practice:
        random.shuffle(cards_list)

    # If practice mode, generate multi-choice distractors across folder vocabulary pool
    questions_list = cards_list
    if is_practice:
        questions_list = MCQEngine.generate_distractors_for_cards(cards_list, num_choices=4)

    return {
        "id": f"folder_{folder.id}",
        "folder_id": folder.id,
        "title": folder.title,
        "description": folder.description or f"Folder containing {len(deck_ids)} decks",
        "cover_image": fix_static_urls(folder.cover_image),
        "is_folder": True,
        "total_decks": len(deck_ids),
        "cards": cards_list,
        "questions": questions_list,
        "user_total_xp": user_total_xp,
        "user_today_xp": user_today_xp,
        "user_today_time": round(user_today_time, 1),
        "user_all_time_time": 0
    }
