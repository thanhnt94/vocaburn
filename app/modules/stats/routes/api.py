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


@router.get("/dashboard/init")
async def get_dashboard_init(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    """
    Consolidated dashboard endpoint: fetches ALL dashboard data in a single
    API call. All DB queries run concurrently via asyncio.gather, eliminating
    the sequential blocking that occurs when the frontend fires 10 separate
    requests to a single-worker Uvicorn server.
    """
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id

    # Import everything we need
    from sqlalchemy import func, case
    from sqlalchemy.orm import selectinload, joinedload
    from sqlalchemy import or_
    from datetime import datetime, timedelta, date
    import math
    from app.modules.deck.models import (
        FlashcardDeck, DeckAttempt, Flashcard, UserAnswer,
        UserDeckGoal, UserDailyProgress, UserCardMastery, UserGlobalGoal
    )
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.gamification.models import UserGamification, Badge, XPTransaction
    from app.modules.notification.interface import NotificationInterface
    from app.modules.stats.models import UserDailyStats

    now = datetime.utcnow()
    today = now.date()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)
    today_str = today.strftime("%Y-%m-%d")

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: Fire off all independent queries concurrently
    # ═══════════════════════════════════════════════════════════════════════════

    # --- Dashboard data queries (user decks, gamify, stats) ---
    subq = select(
        DeckAttempt.deck_id,
        func.max(case((DeckAttempt.is_archived == True, 1), else_=0)).label("is_archived")
    ).where(
        DeckAttempt.user_id == user_id
    ).group_by(DeckAttempt.deck_id).subquery()

    query_my_decks = select(
        FlashcardDeck,
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count"),
        subq.c.is_archived
    ).join(subq, FlashcardDeck.id == subq.c.deck_id).options(selectinload(FlashcardDeck.tags))

    # --- Global Goals ---
    query_global_goal = select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id)

    # --- Active Goals ---
    query_active_goals = select(UserDeckGoal).options(
        joinedload(UserDeckGoal.deck)
    ).filter(UserDeckGoal.user_id == user_id, UserDeckGoal.status == "active")

    # --- Today Daily Stats ---
    query_today_stats = select(UserDailyStats).where(
        UserDailyStats.user_id == user_id, UserDailyStats.date >= today_start
    )

    # --- Heatmap ---
    heatmap_start = today - timedelta(days=365)
    query_heatmap = select(
        UserDailyStats.date, UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id, UserDailyStats.date >= heatmap_start
    ).order_by(UserDailyStats.date)

    # --- FSRS Forecast: all due dates ---
    query_dues = select(UserCardMastery.due).where(
        UserCardMastery.user_id == user_id,
        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
    )

    # --- Gamification stats ---
    query_gamify = select(UserGamification).where(UserGamification.user_id == user_id)

    # --- Badges ---
    query_badges = select(Badge)

    # --- Mastery counts for badges ---
    query_mastery_count = select(func.count(UserCardMastery.id)).where(
        UserCardMastery.user_id == user_id, UserCardMastery.box_level == 5
    )

    # --- Goals crusher for badges ---
    query_goals_met = select(func.count(UserDailyProgress.id)).where(
        UserDailyProgress.goal.has(user_id=user_id),
        UserDailyProgress.is_target_met == True
    )

    # Fire all queries concurrently
    (
        res_my_decks,
        res_global_goal,
        res_active_goals,
        res_today_stats,
        res_heatmap,
        res_dues,
        res_gamify,
        res_badges,
        res_mastery_count,
        res_goals_met,
        gamify_data,
        stats_summary,
        notifications,
        unread_count,
        daily_comparison_data,
    ) = await asyncio.gather(
        db.execute(query_my_decks),
        db.execute(query_global_goal),
        db.execute(query_active_goals),
        db.execute(query_today_stats),
        db.execute(query_heatmap),
        db.execute(query_dues),
        db.execute(query_gamify),
        db.execute(query_badges),
        db.execute(query_mastery_count),
        db.execute(query_goals_met),
        GamificationInterface.get_user_stats(db, user_id),
        StatsInterface.get_user_summary(db, user_id),
        NotificationInterface.get_latest(db, user_id),
        NotificationInterface.get_unread_count(db, user_id),
        AnalyticsService.get_daily_comparison_stats(db, user_id),
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: Process results (all CPU-bound, no I/O blocking)
    # ═══════════════════════════════════════════════════════════════════════════

    # --- 1. Dashboard Data (user, decks) ---
    my_decks_data = []
    archived_decks_data = []
    for row in res_my_decks.all():
        q, count, is_archived = row
        deck_dict = {
            "id": q.id, "title": q.title, "description": q.description,
            "cover_image": q.cover_image, "questions_count": count or 0,
            "cards_count": count or 0, "tags": [t.name for t in q.tags],
            "is_creator": q.creator_id == user_id
        }
        if is_archived:
            archived_decks_data.append(deck_dict)
        else:
            my_decks_data.append(deck_dict)

    dashboard_data = {
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
        "my_decks": my_decks_data,
        "my_quizzes": my_decks_data,
        "archived_decks": archived_decks_data,
        "archived_quizzes": archived_decks_data,
        "gamify": gamify_data,
        "stats_summary": stats_summary,
        "notifications": notifications,
        "unread_count": unread_count,
    }

    # --- 2. Global Goals ---
    global_goal = res_global_goal.scalar_one_or_none()
    if not global_goal:
        global_goal = UserGlobalGoal(user_id=user_id, daily_time_target=20, daily_card_target=20, daily_new_card_target=10)
        db.add(global_goal)
        await db.commit()
        await db.refresh(global_goal)

    today_stats = res_today_stats.scalar_one_or_none()
    actual_seconds = today_stats.total_time_seconds if today_stats else 0
    actual_minutes = round(actual_seconds / 60, 1)
    actual_cards = today_stats.questions_attempted if today_stats else 0
    actual_correct = today_stats.correct_answers if today_stats else 0

    # New cards completed today (needs a subquery)
    first_answers_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("first_answered_at")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id
    ).group_by(UserAnswer.card_id).subquery()

    new_cards_res, xp_today_res = await asyncio.gather(
        db.execute(select(func.count(first_answers_sub.c.card_id)).where(
            first_answers_sub.c.first_answered_at >= today_start
        )),
        db.execute(select(func.sum(XPTransaction.amount)).where(
            XPTransaction.user_id == user_id, XPTransaction.created_at >= today_start
        ))
    )
    actual_new_cards = new_cards_res.scalar() or 0
    actual_xp_today = xp_today_res.scalar() or 0

    global_goals_data = {
        "daily_time_target": global_goal.daily_time_target,
        "daily_card_target": global_goal.daily_card_target,
        "daily_new_card_target": global_goal.daily_new_card_target,
        "actual_time_minutes": actual_minutes,
        "actual_cards_completed": actual_cards,
        "actual_new_cards_completed": actual_new_cards,
        "actual_correct_answers": actual_correct,
        "actual_xp_gained_today": actual_xp_today,
    }

    # --- 3. Active Goals ---
    goals = res_active_goals.scalars().all()
    active_goals_data = []
    if goals:
        goal_ids = [g.id for g in goals]
        deck_ids = [g.deck_id for g in goals]

        # Batch queries for goals detail
        prog_res, deck_progress_res, c_count_res, ignored_res, learned_res = await asyncio.gather(
            db.execute(select(UserDailyProgress).filter(
                UserDailyProgress.goal_id.in_(goal_ids), UserDailyProgress.date == today_str
            )),
            db.execute(
                select(Flashcard.deck_id, func.count(first_answers_sub.c.card_id))
                .join(Flashcard, Flashcard.id == first_answers_sub.c.card_id)
                .where(first_answers_sub.c.first_answered_at >= today_start)
                .group_by(Flashcard.deck_id)
            ),
            db.execute(select(Flashcard.deck_id, func.count(Flashcard.id)).filter(
                Flashcard.deck_id.in_(deck_ids)).group_by(Flashcard.deck_id)
            ),
            db.execute(
                select(Flashcard.deck_id, func.count(UserCardMastery.id))
                .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
                .filter(Flashcard.deck_id.in_(deck_ids), UserCardMastery.user_id == user_id,
                        UserCardMastery.is_ignored == True)
                .group_by(Flashcard.deck_id)
            ),
            db.execute(
                select(Flashcard.deck_id, func.count(UserCardMastery.id))
                .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
                .filter(Flashcard.deck_id.in_(deck_ids), UserCardMastery.user_id == user_id,
                        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None)))
                .group_by(Flashcard.deck_id)
            ),
        )

        progress_map = {p.goal_id: p for p in prog_res.scalars().all()}
        deck_progress_map = {r[0]: r[1] for r in deck_progress_res.all()}
        c_count_map = {r[0]: r[1] for r in c_count_res.all()}
        ignored_map = {r[0]: r[1] for r in ignored_res.all()}
        learned_map = {r[0]: r[1] for r in learned_res.all()}

        for goal in goals:
            deck = goal.deck
            if not deck:
                continue
            total_raw = c_count_map.get(goal.deck_id, 0)
            ign = ignored_map.get(goal.deck_id, 0)
            total_cards = max(0, total_raw - ign)
            total_learned = learned_map.get(goal.deck_id, 0)
            done_today = deck_progress_map.get(goal.deck_id, 0)
            progress = progress_map.get(goal.id)
            is_met = (progress.is_target_met if progress else False) or (done_today >= goal.daily_target)
            remaining = max(0, total_cards - total_learned)
            days_est = math.ceil(remaining / goal.daily_target) if goal.daily_target > 0 else 0

            active_goals_data.append({
                "goal_id": goal.id, "deck_id": goal.deck_id,
                "quiz_id": goal.deck_id, "deck_title": deck.title,
                "quiz_title": deck.title, "cover_image": deck.cover_image,
                "total_cards": total_cards, "total_questions": total_cards,
                "total_learned": total_learned, "daily_target": goal.daily_target,
                "done_today": done_today, "is_target_met": is_met,
                "streak_count": goal.streak_count, "days_remaining_est": days_est,
            })

    # --- 4. Today Review ---
    today_review_data = await DeckService.get_today_review(db, user_id)

    # --- 5. FSRS Review Forecast ---
    dues = res_dues.scalars().all()
    hourly_counts = [0] * 24
    daily_counts = [0] * 30
    for due_dt in dues:
        if not due_dt:
            continue
        if due_dt < today_start:
            hourly_counts[0] += 1
            daily_counts[0] += 1
        elif today_start <= due_dt < today_end:
            hourly_counts[due_dt.hour] += 1
            daily_counts[0] += 1
        else:
            days_diff = (due_dt.date() - today).days
            if 0 < days_diff < 30:
                daily_counts[days_diff] += 1

    hourly_data = []
    h_cum = 0
    for h in range(24):
        h_cum += hourly_counts[h]
        hourly_data.append({"hour": h, "label": f"{h:02d}:00", "count": hourly_counts[h], "cumulative": h_cum})

    daily_data = []
    d_cum = 0
    for i in range(30):
        fd = today + timedelta(days=i)
        lbl = "Hôm nay" if i == 0 else ("Ngày mai" if i == 1 else fd.strftime("%d/%m"))
        d_cum += daily_counts[i]
        daily_data.append({"day_index": i, "date": fd.strftime("%Y-%m-%d"), "label": lbl, "count": daily_counts[i], "cumulative": d_cum})

    weekly_data = []
    w_cum = 0
    for w in range(4):
        s, e = w * 7, w * 7 + 7
        wc = sum(daily_counts[s:e])
        w_cum += wc
        sd, ed = today + timedelta(days=s), today + timedelta(days=e - 1)
        weekly_data.append({
            "week_index": w, "label": f"Tuần {w+1}",
            "range": f"{sd.strftime('%d/%m')}-{ed.strftime('%d/%m')}",
            "count": wc, "cumulative": w_cum
        })

    forecast_data = {"hourly": hourly_data, "daily": daily_data, "weekly": weekly_data}

    # --- 6. Heatmap ---
    heatmap_data = []
    for row in res_heatmap.all():
        dv = row[0]
        if isinstance(dv, str):
            ds = dv[:10]
        elif dv:
            ds = dv.strftime("%Y-%m-%d")
        else:
            ds = ""
        heatmap_data.append({"date": ds, "count": row[1] or 0})

    # --- 7. Leaderboard (simplified: XP top 5 only for dashboard) ---
    from app.modules.auth.models import User as UserModel
    if time_filter == "all_time":
        lb_stmt = select(
            UserGamification.user_id, UserModel.username,
            UserGamification.xp.label("xp"), UserGamification.level,
            UserGamification.streak_count
        ).join(UserModel, UserModel.id == UserGamification.user_id).order_by(
            UserGamification.xp.desc()
        ).limit(5)
    else:
        start_date_lb = None
        if time_filter == "today":
            start_date_lb = today_start
        elif time_filter == "week":
            start_date_lb = today_start - timedelta(days=today_start.weekday())
        elif time_filter == "month":
            start_date_lb = today_start.replace(day=1)

        lb_stmt = select(
            XPTransaction.user_id, UserModel.username,
            func.sum(XPTransaction.amount).label("xp"),
            UserGamification.level, UserGamification.streak_count
        ).join(UserModel, UserModel.id == XPTransaction.user_id).outerjoin(
            UserGamification, UserGamification.user_id == XPTransaction.user_id
        )
        if start_date_lb:
            lb_stmt = lb_stmt.where(XPTransaction.created_at >= start_date_lb)
        lb_stmt = lb_stmt.group_by(
            XPTransaction.user_id, UserModel.username,
            UserGamification.level, UserGamification.streak_count
        ).order_by(func.sum(XPTransaction.amount).desc()).limit(5)

    lb_res = await db.execute(lb_stmt)
    leaderboard = []
    current_user_rank = None
    for rank, row in enumerate(lb_res.all(), 1):
        entry = {
            "rank": rank, "user_id": row.user_id, "username": row.username,
            "xp": row.xp or 0, "level": row.level or 1,
            "streak": row.streak_count or 0,
            "is_current_user": row.user_id == user_id,
        }
        leaderboard.append(entry)
        if row.user_id == user_id:
            current_user_rank = rank

    if current_user_rank is None:
        user_gamify = res_gamify.scalar_one_or_none()
        user_xp = user_gamify.xp if user_gamify else 0
        cnt_res = await db.execute(
            select(func.count(UserGamification.user_id)).where(UserGamification.xp > user_xp)
        )
        current_user_rank = (cnt_res.scalar() or 0) + 1
        leaderboard.append({
            "rank": current_user_rank, "user_id": user_id,
            "username": user.username, "xp": user_xp,
            "level": user_gamify.level if user_gamify else 1,
            "streak": user_gamify.streak_count if user_gamify else 0,
            "is_current_user": True, "out_of_top_5": True,
        })

    leaderboard_data = {"leaderboard": leaderboard, "current_user_rank": current_user_rank}

    # --- 8. Badges Progress (top 3 closest) ---
    user_gamify_obj = res_gamify.scalar_one_or_none()
    all_badges = res_badges.scalars().all()
    mastery_count = res_mastery_count.scalar() or 0
    goals_met_count = res_goals_met.scalar() or 0

    earned_ids = set((user_gamify_obj.badges or []) if user_gamify_obj else [])
    badges_progress = []
    for badge in all_badges:
        if badge.id in earned_ids:
            continue
        target = badge.criteria_value or 1
        current = 0
        if badge.criteria_type == 'xp':
            current = user_gamify_obj.xp if user_gamify_obj else 0
        elif badge.criteria_type == 'streak':
            current = user_gamify_obj.streak_count if user_gamify_obj else 0
        elif badge.criteria_type == 'mastery':
            current = mastery_count
        elif badge.criteria_type == 'goals':
            current = goals_met_count
        pct = min(100.0, (current / target) * 100.0) if target > 0 else 0.0
        badges_progress.append({
            "id": badge.id, "name": badge.name, "description": badge.description,
            "icon": badge.icon, "criteria_type": badge.criteria_type,
            "target_value": target, "current_value": current,
            "percentage": round(pct, 1)
        })
    badges_progress.sort(key=lambda x: x["percentage"], reverse=True)
    badges_progress = badges_progress[:3]

    # --- 9. Weekly Report ---
    # Lightweight inline computation
    start_cur = today - timedelta(days=6)
    cur_stmt = select(
        func.sum(UserDailyStats.questions_attempted),
        func.sum(UserDailyStats.correct_answers),
        func.sum(UserDailyStats.total_time_seconds)
    ).where(UserDailyStats.user_id == user_id, UserDailyStats.date >= start_cur)

    start_prev = today - timedelta(days=13)
    end_prev = today - timedelta(days=7)
    prev_stmt = select(
        func.sum(UserDailyStats.questions_attempted),
        func.sum(UserDailyStats.correct_answers)
    ).where(UserDailyStats.user_id == user_id, UserDailyStats.date >= start_prev, UserDailyStats.date <= end_prev)

    cur_res_w, prev_res_w = await asyncio.gather(db.execute(cur_stmt), db.execute(prev_stmt))
    cr = cur_res_w.one_or_none()
    pr = prev_res_w.one_or_none()
    cur_q = (cr[0] or 0) if cr else 0
    cur_c = (cr[1] or 0) if cr else 0
    cur_t = (cr[2] or 0) if cr else 0
    prev_q = (pr[0] or 0) if pr else 0
    prev_c = (pr[1] or 0) if pr else 0
    cur_acc = round(cur_c / cur_q * 100, 1) if cur_q > 0 else 0
    prev_acc = round(prev_c / prev_q * 100, 1) if prev_q > 0 else 0
    q_delta = cur_q - prev_q
    q_pct = round(q_delta / prev_q * 100, 1) if prev_q > 0 else (100.0 if cur_q > 0 else 0.0)

    weekly_report = {
        "current_week": {"questions": cur_q, "accuracy": cur_acc, "time_minutes": round(cur_t / 60, 1)},
        "previous_week": {"questions": prev_q, "accuracy": prev_acc},
        "deltas": {"questions_change_pct": q_pct, "questions_change_absolute": q_delta, "accuracy_change": round(cur_acc - prev_acc, 1)},
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: Return everything in one response
    # ═══════════════════════════════════════════════════════════════════════════
    return {
        "dashboard": dashboard_data,
        "global_goals": global_goals_data,
        "active_goals": active_goals_data,
        "today_review": today_review_data,
        "forecast": forecast_data,
        "heatmap": heatmap_data,
        "weekly_report": weekly_report,
        "daily_comparison": daily_comparison_data,
        "leaderboard": leaderboard_data,
        "badges_progress": badges_progress,
    }

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
                "is_creator": q.creator_id == user_id_int
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
        FlashcardDeck.id.not_in(created_sub)
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
            "is_creator": q.creator_id == user_id_int
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
            "is_creator": q.creator_id == user_id_int
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
            "is_creator": q.creator_id == user_id_int
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
