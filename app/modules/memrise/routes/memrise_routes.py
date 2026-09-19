from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.memrise.services.memrise_service import MemriseService
from app.modules.deck.routes.play import resolve_play_cards
from sqlalchemy import select, func
from app.modules.memrise.models import MemriseCardProgress

router = APIRouter(tags=["Memrise"])

@router.get("/{deck_id}/plant-session")
async def get_plant_session(deck_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    result = await MemriseService.get_plant_session(db, user_id, deck_id)
    # resolve media urls for all generated cards
    if "cards" in result and result["cards"]:
        # Mock up a cards_list for resolve_play_cards
        cards_list = [{"id": c["card_id"], "front": c["front"], "back": c["back"], "others": c["others"]} for c in result["cards"]]
        cards_list = await resolve_play_cards(cards_list, db)
        # Update urls in payload
        for i, c in enumerate(result["cards"]):
            c["front"] = cards_list[i]["front"]
            c["back"] = cards_list[i]["back"]
            c["others"] = cards_list[i]["others"]
            
            # also resolve audio URL for stage 4 if it exists
            if "audio_data" in c and c["audio_data"].get("audio_url"):
                from app.modules.deck.routes.media_resolver import get_sso_server_url, resolve_central_url
                sso_url = await get_sso_server_url(db)
                c["audio_data"]["audio_url"] = resolve_central_url(c["audio_data"]["audio_url"], sso_url)
                
    return result

@router.get("/{deck_id}/water-session")
async def get_water_session(deck_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    result = await MemriseService.get_water_session(db, user_id, deck_id)
    if "cards" in result and result["cards"]:
        cards_list = [{"id": c["card_id"], "front": c["front"], "back": c["back"], "others": c["others"]} for c in result["cards"]]
        cards_list = await resolve_play_cards(cards_list, db)
        for i, c in enumerate(result["cards"]):
            c["front"] = cards_list[i]["front"]
            c["back"] = cards_list[i]["back"]
            c["others"] = cards_list[i]["others"]
            
            if "audio_data" in c and c["audio_data"].get("audio_url"):
                from app.modules.deck.routes.media_resolver import get_sso_server_url, resolve_central_url
                sso_url = await get_sso_server_url(db)
                c["audio_data"]["audio_url"] = resolve_central_url(c["audio_data"]["audio_url"], sso_url)
                
    return result

@router.post("/submit-answer")
async def submit_answer(data: Dict[str, Any], request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    card_id = int(data.get("card_id", 0))
    is_correct = bool(data.get("is_correct", False))
    session_type = data.get("session_type", "plant")
    
    if not card_id:
        raise HTTPException(status_code=400, detail="card_id is required")
        
    return await MemriseService.submit_answer(db, user_id, card_id, is_correct, session_type)

@router.get("/{deck_id}/stats")
async def get_stats(deck_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    # Get total bloomed
    bloomed_res = await db.execute(
        select(func.count(MemriseCardProgress.id))
        .where(MemriseCardProgress.user_id == user_id, MemriseCardProgress.deck_id == deck_id, MemriseCardProgress.is_bloomed == True)
    )
    bloomed = bloomed_res.scalar() or 0
    
    # Get planting
    planting_res = await db.execute(
        select(func.count(MemriseCardProgress.id))
        .where(MemriseCardProgress.user_id == user_id, MemriseCardProgress.deck_id == deck_id, MemriseCardProgress.is_bloomed == False)
    )
    planting = planting_res.scalar() or 0
    
    from datetime import datetime
    now = datetime.utcnow()
    # Get due for watering
    wilting_res = await db.execute(
        select(func.count(MemriseCardProgress.id))
        .where(MemriseCardProgress.user_id == user_id, MemriseCardProgress.deck_id == deck_id, MemriseCardProgress.is_bloomed == True, MemriseCardProgress.next_water_at <= now)
    )
    wilting = wilting_res.scalar() or 0
    
    return {
        "bloomed": bloomed,
        "planting": planting,
        "wilting": wilting
    }
