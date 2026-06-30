from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.stats.services.analytics_service import AnalyticsService
from app.modules.deck.services.deck_service import DeckService
from app.modules.stats.interface import StatsInterface

router = APIRouter(tags=["Stats"])

@router.get("/stats/detailed")
async def get_detailed_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_user_detailed_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/leaderboard")
async def get_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_leaderboard(db, user.id, time_filter=time_filter)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/daily-comparison")
async def get_daily_comparison(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_daily_comparison_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}


@router.get("/dashboard/data")
async def get_dashboard_data(request: Request, only_created: bool = False, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id_int = user.id
    
    from sqlalchemy import func, case
    from sqlalchemy.orm import selectinload
    from app.modules.deck.models import FlashcardDeck, DeckAttempt, Flashcard
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.notification.interface import NotificationInterface

    # Query B: Created Decks (creator_id == user_id_int)
    query_b = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
    ).options(
        selectinload(FlashcardDeck.tags)
    )
    if user.role != "admin":
        query_b = query_b.where(FlashcardDeck.creator_id == user_id_int)

    if only_created:
        res_b = await db.execute(query_b)
        created_decks_data = []
        for row in res_b.all():
            q, count = row
            deck_dict = {
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "cover_image": q.cover_image,
                "questions_count": count or 0,
                "cards_count": count or 0,  # compatibility
                "tags": [t.name for t in q.tags],
                "is_creator": q.creator_id == user_id_int,
                "is_public": q.is_public
            }
            created_decks_data.append(deck_dict)
        return {
            "created_decks": created_decks_data,
            "created_quizzes": created_decks_data  # compatibility
        }

    # Query A: My & Archived Decks (Join with grouped DeckAttempt subquery to prevent duplicates)
    subq = select(
        DeckAttempt.deck_id,
        func.max(case((DeckAttempt.is_archived == True, 1), else_=0)).label("is_archived")
    ).where(
        DeckAttempt.user_id == user_id_int
    ).group_by(
        DeckAttempt.deck_id
    ).subquery()

    query_a = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count"),
        subq.c.is_archived
    ).join(
        subq, FlashcardDeck.id == subq.c.deck_id
    ).options(
        selectinload(FlashcardDeck.tags)
    )

    # Query C: Discover Decks (exclude attempted/created, limit 12, order by created_at desc)
    attempted_sub = select(DeckAttempt.deck_id).where(DeckAttempt.user_id == user_id_int)
    created_sub = select(FlashcardDeck.id).where(FlashcardDeck.creator_id == user_id_int)
    
    query_c = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
    ).options(
        selectinload(FlashcardDeck.tags)
    ).where(
        FlashcardDeck.id.not_in(attempted_sub),
        FlashcardDeck.id.not_in(created_sub),
        FlashcardDeck.is_public == True
    ).order_by(
        FlashcardDeck.created_at.desc()
    ).limit(12)

    # Fetch all database queries concurrently using asyncio.gather
    res_a, res_b, res_c, gamify_data, stats_summary, notifications, unread_count = await asyncio.gather(
        db.execute(query_a),
        db.execute(query_b),
        db.execute(query_c),
        GamificationInterface.get_user_stats(db, user_id_int),
        StatsInterface.get_user_summary(db, user_id_int),
        NotificationInterface.get_latest(db, user_id_int),
        NotificationInterface.get_unread_count(db, user_id_int)
    )

    my_decks_data = []
    archived_decks_data = []
    created_decks_data = []
    discover_decks_data = []

    # Map Query A results
    for row in res_a.all():
        q, count, is_archived = row
        deck_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": count or 0,
            "cards_count": count or 0,  # compatibility
            "tags": [t.name for t in q.tags],
            "is_creator": q.creator_id == user_id_int,
            "is_public": q.is_public
        }
        if is_archived:
            archived_decks_data.append(deck_dict)
        else:
            my_decks_data.append(deck_dict)

    # Map Query B results
    for row in res_b.all():
        q, count = row
        deck_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": count or 0,
            "cards_count": count or 0,  # compatibility
            "tags": [t.name for t in q.tags],
            "is_creator": q.creator_id == user_id_int,
            "is_public": q.is_public
        }
        created_decks_data.append(deck_dict)

    # Map Query C results
    for row in res_c.all():
        q, count = row
        deck_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": count or 0,
            "cards_count": count or 0,  # compatibility
            "tags": [t.name for t in q.tags],
            "is_creator": q.creator_id == user_id_int,
            "is_public": q.is_public
        }
        discover_decks_data.append(deck_dict)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "my_decks": my_decks_data,
        "my_quizzes": my_decks_data, # compatibility
        "archived_decks": archived_decks_data,
        "archived_quizzes": archived_decks_data, # compatibility
        "discover_decks": discover_decks_data,
        "discover_quizzes": discover_decks_data, # compatibility
        "created_decks": created_decks_data,
        "created_quizzes": created_decks_data, # compatibility
        "gamify": gamify_data,
        "stats_summary": stats_summary,
        "notifications": notifications,
        "unread_count": unread_count
    }
