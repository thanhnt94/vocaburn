from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.deck.services.deck_service import DeckService

router = APIRouter(tags=["Deck"])

@router.get("/today-review")
async def get_today_review_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    tz_offset = request.query_params.get("tz_offset", -420)
    try:
        tz_offset = int(tz_offset)
    except (ValueError, TypeError):
        tz_offset = -420
    try:
        return await DeckService.get_today_review(db, user_id, tz_offset=tz_offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
