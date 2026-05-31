from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.db import get_db
from datetime import datetime, date, timedelta
from typing import Optional

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/leaderboard")
async def get_leaderboard(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Returns Top 10 users sorted by total XP, plus the current user's rank.
    """
    from app.modules.gamification.models import UserGamification
    from app.modules.auth.models import User
    from app.modules.auth.services.auth_service import AuthService

    current_user = await AuthService.get_current_user(request, db)
    current_user_id = current_user.id if current_user else None

    # Fetch top 10 by XP with username join
    stmt = (
        select(UserGamification, User.username)
        .join(User, User.id == UserGamification.user_id)
        .order_by(UserGamification.xp.desc())
        .limit(10)
    )
    results = await db.execute(stmt)
    rows = results.all()

    leaderboard = []
    current_user_rank = None
    for rank, (gam, username) in enumerate(rows, start=1):
        entry = {
            "rank": rank,
            "user_id": gam.user_id,
            "username": username,
            "xp": gam.xp,
            "level": gam.level,
            "streak": gam.streak_count,
            "is_current_user": gam.user_id == current_user_id,
        }
        leaderboard.append(entry)
        if gam.user_id == current_user_id:
            current_user_rank = rank

    # If current user isn't in top 10, find their rank separately
    if current_user_id and current_user_rank is None:
        # Count how many users have more XP
        user_xp_res = await db.execute(
            select(UserGamification.xp).where(UserGamification.user_id == current_user_id)
        )
        user_xp = user_xp_res.scalar() or 0

        count_res = await db.execute(
            select(func.count(UserGamification.user_id)).where(UserGamification.xp > user_xp)
        )
        ahead_count = count_res.scalar() or 0
        current_user_rank = ahead_count + 1

        # Get their stats for display
        cur_gam_res = await db.execute(
            select(UserGamification).where(UserGamification.user_id == current_user_id)
        )
        cur_gam = cur_gam_res.scalar_one_or_none()
        if cur_gam:
            leaderboard.append({
                "rank": current_user_rank,
                "user_id": current_user_id,
                "username": current_user.username,
                "xp": cur_gam.xp,
                "level": cur_gam.level,
                "streak": cur_gam.streak_count,
                "is_current_user": True,
                "out_of_top_10": True,
            })

    from app.modules.stats.models import UserDailyStats
    # Fetch top 10 by time
    time_stmt = (
        select(UserDailyStats.user_id, User.username, func.sum(UserDailyStats.total_time_seconds).label("total_time"))
        .join(User, User.id == UserDailyStats.user_id)
        .group_by(UserDailyStats.user_id, User.username)
        .order_by(func.sum(UserDailyStats.total_time_seconds).desc())
        .limit(10)
    )
    time_results = await db.execute(time_stmt)
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
        user_time_res = await db.execute(
            select(func.sum(UserDailyStats.total_time_seconds))
            .where(UserDailyStats.user_id == current_user_id)
        )
        user_time = int(user_time_res.scalar() or 0)
        
        # We can't easily count users ahead in a simple query without CTE, so just append unranked for simplicity or use a subquery
        time_leaderboard.append({
            "rank": ">10",
            "user_id": current_user_id,
            "username": current_user.username,
            "total_time": user_time,
            "is_current_user": True,
            "out_of_top_10": True,
        })

    return {
        "leaderboard": leaderboard,
        "current_user_rank": current_user_rank,
        "time_leaderboard": time_leaderboard,
        "current_user_time_rank": current_user_time_rank,
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
    from app.modules.quiz.models import UserQuestionMastery, Question, UserAnswer, QuizAttempt
    from app.modules.stats.models import UserDailyStats
    from app.modules.gamification.models import UserDailyActivity
    from sqlalchemy import and_, cast, String

    current_user = await AuthService.get_current_user(request, db)
    user_id = current_user.id if current_user else 1

    # Parse local_date
    try:
        activity_date = date.fromisoformat(local_date) if local_date else datetime.utcnow().date()
    except ValueError:
        activity_date = datetime.utcnow().date()

    today_str = activity_date.isoformat()

    # ─────────────────────────────────────────────────────────────────────────
    # Challenge 1: Clear all FSRS-due cards
    # Count cards that are due today or overdue
    # ─────────────────────────────────────────────────────────────────────────
    now_utc = datetime.utcnow()
    due_res = await db.execute(
        select(func.count(UserQuestionMastery.id)).where(
            UserQuestionMastery.user_id == user_id,
            UserQuestionMastery.due <= now_utc,
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
    from app.modules.quiz.models import UserQuestionMastery
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
        select(func.count(UserQuestionMastery.id)).where(
            UserQuestionMastery.user_id == user_id,
            UserQuestionMastery.box_level == 5
        )
    )
    current_mastery = mastered_res.scalar() or 0
    
    # goals crusher: count times is_target_met was True in UserDailyProgress
    from app.modules.quiz.models import UserDailyProgress
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

