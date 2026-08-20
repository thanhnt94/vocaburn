from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.models import User
from app.modules.deck.models import CardContribution, ContributionLike, Flashcard, FlashcardDeck
from app.modules.deck.schemas import ContributionCreate, ContributionResponse, ContributionStatusUpdate

router = APIRouter(tags=["Community"])

@router.get("/question/{card_id}/contributions", response_model=List[ContributionResponse])
async def get_card_contributions(card_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    stmt = (
        select(CardContribution)
        .where(CardContribution.card_id == card_id, CardContribution.parent_id == None)
        .options(
            selectinload(CardContribution.user),
            selectinload(CardContribution.replies).selectinload(CardContribution.user)
        )
        .order_by(CardContribution.created_at.asc())
    )
    result = await db.execute(stmt)
    contributions = result.scalars().all()
    
    all_ids = []
    for c in contributions:
        all_ids.append(c.id)
        for r in c.replies:
            all_ids.append(r.id)
            
    liked_ids = set()
    if all_ids:
        likes_stmt = select(ContributionLike.contribution_id).where(
            ContributionLike.user_id == user_id,
            ContributionLike.contribution_id.in_(all_ids)
        )
        likes_res = await db.execute(likes_stmt)
        liked_ids = {row[0] for row in likes_res.fetchall()}
        
    res = []
    for c in contributions:
        res.append({
            "id": c.id,
            "card_id": c.card_id,
            "user_id": c.user_id,
            "parent_id": c.parent_id,
            "type": c.type,
            "content": c.content,
            "status": c.status,
            "likes_count": c.likes_count,
            "is_liked_by_me": c.id in liked_ids,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user": {
                "id": c.user.id if c.user else 0,
                "username": c.user.username if c.user else "Deleted User",
                "full_name": c.user.full_name if c.user else "",
                "role": c.user.role if c.user else "user"
            },
            "replies": [
                {
                    "id": r.id,
                    "card_id": r.card_id,
                    "user_id": r.user_id,
                    "parent_id": r.parent_id,
                    "type": r.type,
                    "content": r.content,
                    "status": r.status,
                    "likes_count": r.likes_count,
                    "is_liked_by_me": r.id in liked_ids,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "user": {
                        "id": r.user.id if r.user else 0,
                        "username": r.user.username if r.user else "Deleted User",
                        "full_name": r.user.full_name if r.user else "",
                        "role": r.user.role if r.user else "user"
                    },
                    "replies": []
                } for r in sorted(c.replies, key=lambda x: x.created_at)
            ]
        })
    return res

@router.post("/question/{card_id}/contributions", response_model=ContributionResponse)
async def create_card_contribution(
    card_id: int, 
    payload: ContributionCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    card = await db.get(Flashcard, card_id)
    if not card:
        return JSONResponse({"detail": "Card not found"}, status_code=404)
        
    new_contrib = CardContribution(
        card_id=card_id,
        user_id=user_id,
        parent_id=payload.parent_id,
        type=payload.type,
        content=payload.content,
        status="active"
    )
    db.add(new_contrib)
    await db.commit()
    await db.refresh(new_contrib)
    
    contrib_res = await db.execute(
        select(CardContribution)
        .where(CardContribution.id == new_contrib.id)
        .options(selectinload(CardContribution.user))
    )
    contrib_loaded = contrib_res.scalar()
    
    return {
        "id": contrib_loaded.id,
        "card_id": contrib_loaded.card_id,
        "user_id": contrib_loaded.user_id,
        "parent_id": contrib_loaded.parent_id,
        "type": contrib_loaded.type,
        "content": contrib_loaded.content,
        "status": contrib_loaded.status,
        "likes_count": contrib_loaded.likes_count,
        "is_liked_by_me": False,
        "created_at": contrib_loaded.created_at.isoformat() if contrib_loaded.created_at else None,
        "user": {
            "id": contrib_loaded.user.id if contrib_loaded.user else 0,
            "username": contrib_loaded.user.username if contrib_loaded.user else "Deleted User",
            "full_name": contrib_loaded.user.full_name if contrib_loaded.user else "",
            "role": contrib_loaded.user.role if contrib_loaded.user else "user"
        },
        "replies": []
    }

@router.post("/contributions/{contribution_id}/like")
async def like_contribution(contribution_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    like_stmt = select(ContributionLike).where(
        ContributionLike.user_id == user_id,
        ContributionLike.contribution_id == contribution_id
    )
    like_res = await db.execute(like_stmt)
    like_obj = like_res.scalar_one_or_none()
    
    if like_obj:
        await db.delete(like_obj)
        contrib.likes_count = max(0, contrib.likes_count - 1)
        liked = False
    else:
        new_like = ContributionLike(user_id=user_id, contribution_id=contribution_id)
        db.add(new_like)
        contrib.likes_count += 1
        liked = True
        
    await db.commit()
    return {"liked": liked, "likes_count": contrib.likes_count}

@router.delete("/contributions/{contribution_id}")
async def delete_contribution(contribution_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    if contrib.user_id != user_id and user.role != 'admin':
        return JSONResponse({"detail": "Permission denied"}, status_code=403)
        
    await db.delete(contrib)
    await db.commit()
    return {"status": "success"}

@router.put("/contributions/{contribution_id}/status")
async def update_contribution_status(
    contribution_id: int, 
    payload: ContributionStatusUpdate, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    user_id = AuthService.get_user_id(request)
    user = await db.get(User, user_id)
    if not user:
        return JSONResponse({"detail": "User not found"}, status_code=404)
        
    contrib = await db.get(CardContribution, contribution_id)
    if not contrib:
        return JSONResponse({"detail": "Contribution not found"}, status_code=404)
        
    is_authorized = False
    if user.role == 'admin':
        is_authorized = True
    else:
        card = await db.get(Flashcard, contrib.card_id)
        deck = await db.get(FlashcardDeck, card.deck_id) if card else None
        if deck and deck.creator_id == user_id:
            is_authorized = True
            
    if not is_authorized:
        return JSONResponse({"detail": "Permission denied. Only Admins or Deck Creators can update status."}, status_code=403)
        
    contrib.status = payload.status
    await db.commit()
    return {"status": "success", "new_status": contrib.status}
