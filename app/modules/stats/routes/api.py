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
    
    from sqlalchemy import func, case, or_
    from sqlalchemy.orm import selectinload
    from app.modules.deck.models import FlashcardDeck, DeckAttempt, Flashcard, UserAnswer, DeckCollaborator, UserCardMastery, UserDeckSettings
    from app.modules.auth.models import User
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

    # Query Creators in bulk
    query_users = select(User.id, User.username)

    # Query User's Mastery progress per deck in bulk
    query_mastery = select(
        Flashcard.deck_id,
        func.count(UserCardMastery.id).label("learned_count"),
        func.sum(case((UserCardMastery.box_level >= 4, 1), else_=0)).label("mastered_count")
    ).join(
        UserCardMastery, UserCardMastery.card_id == Flashcard.id
    ).where(
        UserCardMastery.user_id == user_id_int,
        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
    ).group_by(Flashcard.deck_id)

    # Query User Deck Settings in bulk to check roadmap_active
    query_user_settings = select(
        UserDeckSettings.deck_id,
        UserDeckSettings.settings
    ).where(UserDeckSettings.user_id == user_id_int)

    if only_created:
        res_b = await db.execute(query_b)
        res_users = await db.execute(query_users)
        res_mastery = await db.execute(query_mastery)
        res_user_settings = await db.execute(query_user_settings)
        creator_map = {row[0]: row[1] for row in res_users.all()}
        mastery_map = {row[0]: {"learned": row[1] or 0, "mastered": row[2] or 0} for row in res_mastery.all()}
        user_settings_map = {row[0]: row[1] for row in res_user_settings.all() if row[1]}
        
        created_decks_data = []
        for row in res_b.all():
            q, count = row
            prog = mastery_map.get(q.id, {"learned": 0, "mastered": 0})
            total_cnt = count or 0
            learned_cnt = prog.get("learned", 0)
            mastered_cnt = prog.get("mastered", 0)
            pct = round((learned_cnt / total_cnt) * 100) if total_cnt > 0 else 0
            c_name = creator_map.get(q.creator_id, user.username if q.creator_id == user_id_int else ("Hệ thống" if not q.creator_id else f"user_{q.creator_id}"))
            
            custom_setting = user_settings_map.get(q.id)
            settings_data = custom_setting if (custom_setting and isinstance(custom_setting, dict)) else (q.practice_settings or {})
            pipeline = settings_data.get("pipeline", [])
            has_roadmap = bool(settings_data.get("roadmap_active", False) and isinstance(pipeline, list) and len(pipeline) > 0)

            deck_dict = {
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "cover_image": q.cover_image,
                "questions_count": total_cnt,
                "cards_count": total_cnt,
                "tags": [t.name for t in q.tags],
                "creator_id": q.creator_id,
                "creator_name": c_name,
                "is_creator": (q.creator_id == user_id_int or user.role == "admin" or getattr(user, "is_admin", False) or user_id_int == 1),
                "is_public": q.is_public,
                "practice_settings": q.practice_settings or {},
                "has_roadmap": has_roadmap,
                "learned_count": learned_cnt,
                "mastered_count": mastered_cnt,
                "progress_percent": pct,
                "last_studied_at": None
            }
            created_decks_data.append(deck_dict)
        return {
            "created_decks": created_decks_data,
            "created_quizzes": created_decks_data
        }

    # Query A: My & Archived Decks
    subq = select(
        DeckAttempt.deck_id,
        func.max(case((DeckAttempt.is_archived == True, 1), else_=0)).label("is_archived"),
        func.max(func.coalesce(UserAnswer.created_at, DeckAttempt.started_at)).label("last_studied_at")
    ).outerjoin(
        UserAnswer, DeckAttempt.id == UserAnswer.attempt_id
    ).where(
        DeckAttempt.user_id == user_id_int
    ).group_by(
        DeckAttempt.deck_id
    ).subquery()

    collab_sub = select(DeckCollaborator.deck_id).where(DeckCollaborator.user_id == user_id_int)

    query_a = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count"),
        subq.c.is_archived,
        subq.c.last_studied_at
    ).outerjoin(
        subq, FlashcardDeck.id == subq.c.deck_id
    ).options(
        selectinload(FlashcardDeck.tags)
    ).where(
        or_(
            subq.c.deck_id.is_not(None),
            FlashcardDeck.creator_id == user_id_int,
            FlashcardDeck.id.in_(collab_sub)
        )
    ).order_by(
        subq.c.last_studied_at.desc().nulls_last(),
        FlashcardDeck.created_at.desc()
    )

    # Query C: Discover Decks
    attempted_sub = select(DeckAttempt.deck_id).where(DeckAttempt.user_id == user_id_int)
    created_sub = select(FlashcardDeck.id).where(FlashcardDeck.creator_id == user_id_int)
    
    is_admin_user = bool(user.role == "admin" or getattr(user, "is_admin", False) or user_id_int == 1)

    query_c = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
    ).options(
        selectinload(FlashcardDeck.tags)
    ).where(
        FlashcardDeck.id.not_in(attempted_sub),
        FlashcardDeck.id.not_in(created_sub),
        or_(FlashcardDeck.is_public == True, is_admin_user)
    ).order_by(
        FlashcardDeck.created_at.desc()
    ).limit(30 if is_admin_user else 12)

    # Ensure streak is updated if user has recent activity
    try:
        await GamificationInterface.update_streak(db, user_id_int)
    except Exception:
        pass

    # Fetch all database queries safely and sequentially
    res_a = await db.execute(query_a)
    res_b = await db.execute(query_b)
    res_c = await db.execute(query_c)
    res_users = await db.execute(query_users)
    res_mastery = await db.execute(query_mastery)
    res_user_settings = await db.execute(query_user_settings)
    gamify_data = await GamificationInterface.get_user_stats(db, user_id_int)
    stats_summary = await StatsInterface.get_user_summary(db, user_id_int)
    notifications = await NotificationInterface.get_latest(db, user_id_int)
    unread_count = await NotificationInterface.get_unread_count(db, user_id_int)

    creator_map = {row[0]: row[1] for row in res_users.all()}
    mastery_map = {row[0]: {"learned": row[1] or 0, "mastered": row[2] or 0} for row in res_mastery.all()}
    user_settings_map = {row[0]: row[1] for row in res_user_settings.all() if row[1]}

    def format_deck_item(q, count, last_studied=None):
        prog = mastery_map.get(q.id, {"learned": 0, "mastered": 0})
        total_cnt = count or 0
        learned_cnt = prog.get("learned", 0)
        mastered_cnt = prog.get("mastered", 0)
        pct = round((learned_cnt / total_cnt) * 100) if total_cnt > 0 else 0
        c_name = creator_map.get(q.creator_id, user.username if q.creator_id == user_id_int else ("Hệ thống" if not q.creator_id else f"user_{q.creator_id}"))

        custom_setting = user_settings_map.get(q.id)
        settings_data = custom_setting if (custom_setting and isinstance(custom_setting, dict)) else (q.practice_settings or {})
        pipeline = settings_data.get("pipeline", [])
        has_roadmap = bool(settings_data.get("roadmap_active", False) and isinstance(pipeline, list) and len(pipeline) > 0)

        return {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": total_cnt,
            "cards_count": total_cnt,
            "tags": [t.name for t in q.tags],
            "creator_id": q.creator_id,
            "creator_name": c_name,
            "is_creator": (q.creator_id == user_id_int or user.role == "admin" or getattr(user, "is_admin", False) or user_id_int == 1),
            "is_public": q.is_public,
            "practice_settings": q.practice_settings or {},
            "has_roadmap": has_roadmap,
            "learned_count": learned_cnt,
            "mastered_count": mastered_cnt,
            "progress_percent": pct,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "last_studied_at": last_studied.isoformat() if last_studied else None
        }

    my_decks_data = []
    archived_decks_data = []
    created_decks_data = []
    discover_decks_data = []

    # Map Query A results
    for row in res_a.all():
        q, count, is_archived, last_studied_at = row
        deck_dict = format_deck_item(q, count, last_studied_at)
        if is_archived:
            archived_decks_data.append(deck_dict)
        else:
            my_decks_data.append(deck_dict)

    # Map Query B results
    for row in res_b.all():
        q, count = row
        created_decks_data.append(format_deck_item(q, count))

    # Map Query C results
    for row in res_c.all():
        q, count = row
        discover_decks_data.append(format_deck_item(q, count))

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
