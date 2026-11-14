from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.db import get_db
from datetime import datetime, date, timedelta
from typing import Optional
from app.modules.gamification.interface import GamificationInterface

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/leaderboard")
async def get_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    """
    Consolidated Leaderboard proxy delegating to AnalyticsService (Single Source of Truth).
    """
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.services.analytics_service import AnalyticsService

    current_user = await AuthService.get_current_user(request, db)
    current_user_id = current_user.id if current_user else 0
    return await AnalyticsService.get_leaderboard(db, current_user_id, time_filter=time_filter)


@router.get("/challenges")
async def get_daily_challenges(
    request: Request,
    local_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns 3 daily challenges with progress tracking.
    Challenge 1: Clear all due flashcards today (due_cards == 0)
    Challenge 2: Answer >= 30 cards today
    Challenge 3: Keep the streak alive (logged activity today)
    """
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.deck.models import UserCardMastery, Flashcard, UserAnswer, DeckAttempt
    from app.modules.stats.models import UserDailyStats
    from app.modules.gamification.models import UserDailyActivity
    from sqlalchemy import and_, cast, String

    current_user = await AuthService.get_current_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    tz_offset = request.query_params.get("tz_offset", 0)
    try:
        tz_offset = int(tz_offset)
    except (ValueError, TypeError):
        tz_offset = 0

    activity_date = (datetime.utcnow() - timedelta(minutes=tz_offset)).date()
    today_str = activity_date.isoformat()

    # ─────────────────────────────────────────────────────────────────────────
    # Challenge 1: Clear all FSRS-due cards
    # Count cards that are due today or overdue
    # ─────────────────────────────────────────────────────────────────────────
    now_utc = datetime.utcnow()
    due_res = await db.execute(
        select(func.count(UserCardMastery.id)).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.due <= now_utc,
        )
    )
    due_count = due_res.scalar() or 0
    # A card is "cleared" when you've studied it. We track if due_count is 0
    challenge1_current = max(0, -due_count + due_count)  # Will be 0 if any due remain
    challenge1_completed = due_count == 0

    # ─────────────────────────────────────────────────────────────────────────
    # Challenge 2: Answer >= 30 cards today
    # Use UserDailyStats for today
    # ─────────────────────────────────────────────────────────────────────────
    today_start = datetime.combine(activity_date, datetime.min.time())
    daily_stats_res = await db.execute(
        select(UserDailyStats).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= today_start,
        )
    )
    daily_stats = daily_stats_res.scalar_one_or_none()
    cards_today = daily_stats.questions_attempted if daily_stats else 0
    challenge2_target = 30
    challenge2_completed = cards_today >= challenge2_target

    # ─────────────────────────────────────────────────────────────────────────
    # Challenge 3: Keep the streak alive (logged activity today)
    # ─────────────────────────────────────────────────────────────────────────
    has_activity_today = bool(daily_stats and daily_stats.is_active)
    challenge3_completed = has_activity_today or cards_today > 0

    challenges = [
        {
            "id": "clear_reviews",
            "title": "Sạch Bóng Thẻ Ôn",
            "description": "Hoàn thành tất cả thẻ cần ôn tập FSRS hôm nay",
            "emoji": "🃏",
            "reward_xp": 50,
            "target_value": 1,
            "current_value": 1 if challenge1_completed else 0,
            "is_completed": challenge1_completed,
            "detail": f"{due_count} thẻ ôn tập còn lại" if not challenge1_completed else "Đã hoàn thành!",
        },
        {
            "id": "thirty_cards",
            "title": "Vượt Mốc 30 Thẻ",
            "description": f"Học ít nhất 30 thẻ hôm nay ({cards_today}/{challenge2_target})",
            "emoji": "⚡",
            "reward_xp": 75,
            "target_value": challenge2_target,
            "current_value": min(cards_today, challenge2_target),
            "is_completed": challenge2_completed,
            "detail": f"{cards_today}/{challenge2_target} thẻ",
        },
        {
            "id": "keep_streak",
            "title": "Giữ Lửa Streak",
            "description": "Hoàn thành ít nhất 1 bài học hôm nay để duy trì chuỗi",
            "emoji": "🔥",
            "reward_xp": 25,
            "target_value": 1,
            "current_value": 1 if challenge3_completed else 0,
            "is_completed": challenge3_completed,
            "detail": "Đang học!" if challenge3_completed else "Chưa bắt đầu",
        },
    ]

    total_completed = sum(1 for c in challenges if c["is_completed"])
    total_xp_available = sum(c["reward_xp"] for c in challenges)
    xp_earned = sum(c["reward_xp"] for c in challenges if c["is_completed"])

    return {
        "challenges": challenges,
        "total_completed": total_completed,
        "total_count": len(challenges),
        "total_xp_available": total_xp_available,
        "xp_earned": xp_earned,
        "all_completed": total_completed == len(challenges),
    }

@router.get("/badges/progress")
async def get_badges_progress(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import Badge, UserGamification, UserBadge
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.deck.models import UserCardMastery
    from app.modules.stats.models import UserDailyStats
    from fastapi import HTTPException
    
    current_user = await AuthService.get_current_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id
    
    # 1. Fetch user gamification stats
    res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_stats = res.scalar_one_or_none()
    if not user_stats:
        user_stats = UserGamification(user_id=user_id, xp=0, level=1, streak_count=0, badges=[])
        
    ub_res = await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user_id))
    earned_badge_ids = set(r[0] for r in ub_res.all()).union(set(user_stats.badges or []))
    
    # 2. Fetch all badges
    res_badges = await db.execute(select(Badge))
    all_badges = res_badges.scalars().all()
    
    # 3. Calculate actual metrics for comparison
    current_xp = user_stats.xp
    current_streak = user_stats.streak_count
    
    # mastery: count how many cards are box_level == 5 (mastered)
    mastered_res = await db.execute(
        select(func.count(UserCardMastery.id)).where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.box_level == 5
        )
    )
    current_mastery = mastered_res.scalar() or 0
    
    # goals crusher: count times is_target_met was True in UserDailyProgress
    from app.modules.deck.models import UserDailyProgress
    goals_res = await db.execute(
        select(func.count(UserDailyProgress.id)).where(
            UserDailyProgress.goal.has(user_id=user_id),
            UserDailyProgress.is_target_met == True
        )
    )
    current_goals = goals_res.scalar() or 0
    
    # Compute progress for unearned badges
    unearned_progress = []
    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue
            
        target = badge.criteria_value or 1
        current = 0
        
        if badge.criteria_type == 'xp':
            current = current_xp
        elif badge.criteria_type == 'streak':
            current = current_streak
        elif badge.criteria_type == 'mastery':
            current = current_mastery
        elif badge.criteria_type == 'goals':
            current = current_goals
        else:
            current = 0
            
        percentage = min(100.0, (current / target) * 100.0) if target > 0 else 0.0
        
        unearned_progress.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "criteria_type": badge.criteria_type,
            "target_value": target,
            "current_value": current,
            "percentage": round(percentage, 1)
        })
        
    # Sort by percentage descending to get closest to unlock
    unearned_progress.sort(key=lambda x: x["percentage"], reverse=True)
    
    # Return top 3 closest badges
    return unearned_progress[:3]


@router.get("/shop/status")
async def get_shop_status(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    current_user = await AuthService.get_current_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    tz_offset = request.query_params.get("tz_offset", 0)
    try:
        tz_offset = int(tz_offset)
    except (ValueError, TypeError):
        tz_offset = 0

    stats = await GamificationInterface.get_user_stats(db, user_id, tz_offset=tz_offset)
    return {
        "streak_points": stats.get("streak_points", 0),
        "streak_freeze_count": stats.get("streak_freeze_count", 0),
        "streak": stats.get("streak", 0)
    }


@router.post("/shop/buy-freeze")
async def buy_streak_freeze_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    current_user = await AuthService.get_current_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    res = await GamificationInterface.buy_streak_freeze(db, user_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to buy streak freeze"))

    return res


