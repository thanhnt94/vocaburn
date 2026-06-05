from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.modules.deck.services.deck_service import DeckService

router = APIRouter(tags=["Deck"])

@router.get("/today-review")
async def get_today_review_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    try:
        return await DeckService.get_today_review(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
