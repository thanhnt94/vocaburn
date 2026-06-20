from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.db import get_db
from datetime import datetime, date, timedelta
from typing import Optional

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/leaderboard")
async def get_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    """
    Returns Top 5 users sorted by total XP or Time, based on time_filter ('all_time', 'week', 'today').
    """
    from app.modules.gamification.models import UserGamification, XPTransaction
    from app.modules.auth.models import User
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.models import UserDailyStats

    current_user = await AuthService.get_current_user(request, db)
    current_user_id = current_user.id if current_user else None
    
    # Determine date range based on time_filter
    start_date = None
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if time_filter == "today":
        start_date = today
    elif time_filter == "week":
        start_date = today - timedelta(days=today.weekday()) # Monday of this week
    elif time_filter == "month":
        start_date = today.replace(day=1)

    # 1. Fetch XP Leaderboard
    if time_filter == "all_time":
        stmt_xp = (
            select(UserGamification.user_id, User.username, UserGamification.xp.label("xp"), UserGamification.level, UserGamification.streak_count)
            .join(User, User.id == UserGamification.user_id)
            .order_by(UserGamification.xp.desc())
            .limit(5)
        )
    else:
        stmt_xp = (
            select(
                XPTransaction.user_id, 
                User.username, 
                func.sum(XPTransaction.amount).label("xp"),
                UserGamification.level,
                UserGamification.streak_count
            )
            .join(User, User.id == XPTransaction.user_id)
            .outerjoin(UserGamification, UserGamification.user_id == XPTransaction.user_id)
            .where(XPTransaction.created_at >= start_date)
            .group_by(XPTransaction.user_id, User.username, UserGamification.level, UserGamification.streak_count)
            .order_by(func.sum(XPTransaction.amount).desc())
            .limit(5)
        )
        
    results_xp = await db.execute(stmt_xp)
    rows_xp = results_xp.all()

    leaderboard = []
    current_user_rank = None
    for rank, row in enumerate(rows_xp, start=1):
        entry = {
            "rank": rank,
            "user_id": row.user_id,
            "username": row.username,
            "xp": row.xp,
            "level": row.level or 1,
            "streak": row.streak_count or 0,
            "is_current_user": row.user_id == current_user_id,
        }
        leaderboard.append(entry)
        if row.user_id == current_user_id:
            current_user_rank = rank

    # If current user isn't in top 5, find their rank
    if current_user_id and current_user_rank is None:
        user_xp = 0
        ahead_count = 0
        if time_filter == "all_time":
            uxp_res = await db.execute(select(UserGamification.xp).where(UserGamification.user_id == current_user_id))
            user_xp = uxp_res.scalar() or 0
            cnt_res = await db.execute(select(func.count(UserGamification.user_id)).where(UserGamification.xp > user_xp))
            ahead_count = cnt_res.scalar() or 0
        else:
            uxp_res = await db.execute(select(func.sum(XPTransaction.amount)).where(XPTransaction.user_id == current_user_id, XPTransaction.created_at >= start_date))
            user_xp = uxp_res.scalar() or 0
            cnt_res = await db.execute(
                select(func.count(func.distinct(XPTransaction.user_id)))
                .where(XPTransaction.created_at >= start_date)
                .group_by(XPTransaction.user_id)
                .having(func.sum(XPTransaction.amount) > user_xp)
            )
            ahead_count = len(cnt_res.all())

        current_user_rank = ahead_count + 1
        
        cur_gam_res = await db.execute(select(UserGamification).where(UserGamification.user_id == current_user_id))
        cur_gam = cur_gam_res.scalar_one_or_none()
        leaderboard.append({
            "rank": current_user_rank,
            "user_id": current_user_id,
            "username": current_user.username,
            "xp": user_xp,
            "level": cur_gam.level if cur_gam else 1,
            "streak": cur_gam.streak_count if cur_gam else 0,
            "is_current_user": True,
            "out_of_top_5": True,
        })

    # 2. Fetch Time Leaderboard
    stmt_time = (
        select(UserDailyStats.user_id, User.username, func.sum(UserDailyStats.total_time_seconds).label("total_time"))
        .join(User, User.id == UserDailyStats.user_id)
    )
    if start_date:
        stmt_time = stmt_time.where(UserDailyStats.date >= start_date)
        
    stmt_time = stmt_time.group_by(UserDailyStats.user_id, User.username).order_by(func.sum(UserDailyStats.total_time_seconds).desc()).limit(5)
    
    time_results = await db.execute(stmt_time)
    time_rows = time_results.all()

    time_leaderboard = []
    current_user_time_rank = None
    for rank, row in enumerate(time_rows, start=1):
        uid = row.user_id
        time_leaderboard.append({
            "rank": rank,
            "user_id": uid,
            "username": row.username,
            "total_time": int(row.total_time or 0),
            "is_current_user": uid == current_user_id,
        })
        if uid == current_user_id:
            current_user_time_rank = rank

    if current_user_id and current_user_time_rank is None:
        stmt_my_time = select(func.sum(UserDailyStats.total_time_seconds)).where(UserDailyStats.user_id == current_user_id)
        if start_date:
            stmt_my_time = stmt_my_time.where(UserDailyStats.date >= start_date)
        user_time_res = await db.execute(stmt_my_time)
        user_time = int(user_time_res.scalar() or 0)
        
        stmt_ahead_time = select(func.count(func.distinct(UserDailyStats.user_id))).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > user_time)
        if start_date:
            stmt_ahead_time = select(func.count(func.distinct(UserDailyStats.user_id))).where(UserDailyStats.date >= start_date).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > user_time)
        
        ahead_time_res = await db.execute(stmt_ahead_time)
        current_user_time_rank = len(ahead_time_res.all()) + 1
        
        time_leaderboard.append({
            "rank": current_user_time_rank,
            "user_id": current_user_id,
            "username": current_user.username,
            "total_time": user_time,
            "is_current_user": True,
            "out_of_top_5": True,
        })

    # 3. Fetch Cards Leaderboard (Total Reviews/Attempts)
    stmt_cards = (
        select(UserDailyStats.user_id, User.username, func.sum(UserDailyStats.questions_attempted).label("total_cards"))
        .join(User, User.id == UserDailyStats.user_id)
    )
    if start_date:
        stmt_cards = stmt_cards.where(UserDailyStats.date >= start_date)
        
    stmt_cards = stmt_cards.group_by(UserDailyStats.user_id, User.username).order_by(func.sum(UserDailyStats.questions_attempted).desc()).limit(5)
    
    cards_results = await db.execute(stmt_cards)
    cards_rows = cards_results.all()

    cards_leaderboard = []
    current_user_cards_rank = None
    for rank, row in enumerate(cards_rows, start=1):
        uid = row.user_id
        cards_leaderboard.append({
            "rank": rank,
            "user_id": uid,
            "username": row.username,
            "total_cards": int(row.total_cards or 0),
            "is_current_user": uid == current_user_id,
        })
        if uid == current_user_id:
            current_user_cards_rank = rank

    if current_user_id and current_user_cards_rank is None:
        stmt_my_cards = select(func.sum(UserDailyStats.questions_attempted)).where(UserDailyStats.user_id == current_user_id)
        if start_date:
            stmt_my_cards = stmt_my_cards.where(UserDailyStats.date >= start_date)
        user_cards_res = await db.execute(stmt_my_cards)
        user_cards = int(user_cards_res.scalar() or 0)
        
        stmt_ahead_cards = select(func.count(func.distinct(UserDailyStats.user_id))).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > user_cards)
        if start_date:
            stmt_ahead_cards = select(func.count(func.distinct(UserDailyStats.user_id))).where(UserDailyStats.date >= start_date).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > user_cards)
        
        ahead_cards_res = await db.execute(stmt_ahead_cards)
        current_user_cards_rank = len(ahead_cards_res.all()) + 1
        
        cards_leaderboard.append({
            "rank": current_user_cards_rank,
            "user_id": current_user_id,
            "username": current_user.username,
            "total_cards": user_cards,
            "is_current_user": True,
            "out_of_top_5": True,
        })

    # 4. Fetch New Cards Leaderboard (First-time Reviews)
    from app.modules.deck.models import DeckAttempt, UserAnswer
    
    subq = (
        select(
            DeckAttempt.user_id,
            UserAnswer.card_id,
            func.min(UserAnswer.created_at).label("first_answer_time")
        )
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .group_by(DeckAttempt.user_id, UserAnswer.card_id)
    ).subquery()

    stmt_new_cards = (
        select(
            subq.c.user_id,
            User.username,
            func.count(subq.c.card_id).label("new_cards")
        )
        .join(User, User.id == subq.c.user_id)
    )
    if start_date:
        stmt_new_cards = stmt_new_cards.where(subq.c.first_answer_time >= start_date)
        
    stmt_new_cards = (
        stmt_new_cards.group_by(subq.c.user_id, User.username)
        .order_by(func.count(subq.c.card_id).desc())
        .limit(5)
    )
    
    new_cards_results = await db.execute(stmt_new_cards)
    new_cards_rows = new_cards_results.all()

    new_cards_leaderboard = []
    current_user_new_cards_rank = None
    for rank, row in enumerate(new_cards_rows, start=1):
        uid = row.user_id
        new_cards_leaderboard.append({
            "rank": rank,
            "user_id": uid,
            "username": row.username,
            "new_cards": int(row.new_cards or 0),
            "is_current_user": uid == current_user_id,
        })
        if uid == current_user_id:
            current_user_new_cards_rank = rank

    if current_user_id and current_user_new_cards_rank is None:
        stmt_my_new_cards = select(func.count(subq.c.card_id)).where(subq.c.user_id == current_user_id)
        if start_date:
            stmt_my_new_cards = stmt_my_new_cards.where(subq.c.first_answer_time >= start_date)
        user_new_cards_res = await db.execute(stmt_my_new_cards)
        user_new_cards = int(user_new_cards_res.scalar() or 0)
        
        stmt_ahead_new_cards = (
            select(func.count(func.distinct(subq.c.user_id)))
        )
        if start_date:
            stmt_ahead_new_cards = stmt_ahead_new_cards.where(subq.c.first_answer_time >= start_date)
            
        stmt_ahead_new_cards = (
            stmt_ahead_new_cards.group_by(subq.c.user_id)
            .having(func.count(subq.c.card_id) > user_new_cards)
        )
        
        ahead_new_cards_res = await db.execute(stmt_ahead_new_cards)
        current_user_new_cards_rank = len(ahead_new_cards_res.all()) + 1
        
        new_cards_leaderboard.append({
            "rank": current_user_new_cards_rank,
            "user_id": current_user_id,
            "username": current_user.username,
            "new_cards": user_new_cards,
            "is_current_user": True,
            "out_of_top_5": True,
        })

    return {
        "leaderboard": leaderboard,
        "current_user_rank": current_user_rank,
        "time_leaderboard": time_leaderboard,
        "current_user_time_rank": current_user_time_rank,
        "cards_leaderboard": cards_leaderboard,
        "current_user_cards_rank": current_user_cards_rank,
        "new_cards_leaderboard": new_cards_leaderboard,
        "current_user_new_cards_rank": current_user_new_cards_rank,
    }


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
    user_id = current_user.id if current_user else 1

    # Always synchronize to UTC date
    activity_date = datetime.utcnow().date()

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
    act_res = await db.execute(
        select(UserDailyActivity).where(
            and_(
                UserDailyActivity.user_id == user_id,
                UserDailyActivity.activity_date == activity_date,
            )
        )
    )
    has_activity_today = act_res.scalar_one_or_none() is not None
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
    from app.modules.gamification.models import Badge, UserGamification
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
        
    earned_badge_ids = set(user_stats.badges or [])
    
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

