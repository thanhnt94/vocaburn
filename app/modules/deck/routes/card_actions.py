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

