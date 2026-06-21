from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_, and_, case
from sqlalchemy.orm import joinedload, selectinload
from app.core.db import get_db
from app.modules.deck.models import UserDeckSettings, FlashcardDeck, Flashcard, UserAnswer, DeckAttempt, UserCardMastery, UserDeckGoal, UserDailyProgress, UserGlobalGoal, UserPracticeStats
from app.modules.auth.services.auth_service import AuthService
from datetime import datetime, timezone, date, timedelta
import math

router = APIRouter(tags=["Deck Stats"])

@router.get("/stats/practice")
async def get_practice_stats(request: Request, deck_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    query = select(
        UserPracticeStats.practice_mode,
        func.sum(UserPracticeStats.correct_count).label("correct"),
        func.sum(UserPracticeStats.wrong_count).label("wrong"),
        func.sum(UserPracticeStats.total_time_spent).label("time_spent")
    ).where(UserPracticeStats.user_id == user_id)
    
    if deck_id:
        query = query.join(Flashcard, UserPracticeStats.card_id == Flashcard.id).where(Flashcard.deck_id == deck_id)
        
    query = query.group_by(UserPracticeStats.practice_mode)
    res = await db.execute(query)
    
    stats_data = {
        "mcq": {"correct": 0, "wrong": 0, "time_spent": 0.0},
        "typing": {"correct": 0, "wrong": 0, "time_spent": 0.0},
        "listening": {"correct": 0, "wrong": 0, "time_spent": 0.0}
    }
    
    for row in res.all():
        mode = row.practice_mode
        if mode in stats_data:
            stats_data[mode] = {
                "correct": int(row.correct or 0),
                "wrong": int(row.wrong or 0),
                "time_spent": float(row.time_spent or 0.0)
            }
            
    return stats_data


@router.get("/stats")
async def get_deck_stats(db: AsyncSession = Depends(get_db)):
    # 1. Overall accuracy
    total_res = await db.execute(select(func.count(UserAnswer.id)))
    total = total_res.scalar()
    
    correct_res = await db.execute(select(func.count(UserAnswer.id)).filter(UserAnswer.is_correct == True))
    correct = correct_res.scalar()
    
    accuracy = (correct / total * 100) if total > 0 else 0
    
    # 2. Activity by day (last 7 days)
    activity_res = await db.execute(
        select(func.date(UserAnswer.created_at), func.count(UserAnswer.id))
        .group_by(func.date(UserAnswer.created_at))
        .order_by(func.date(UserAnswer.created_at))
        .limit(7)
    )
    activity = activity_res.all()
    
    return {
        "overall_accuracy": accuracy,
        "total_answers": total,
        "correct_answers": correct,
        "activity_data": activity
    }

@router.post("/goals")
async def create_or_update_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    deck_id = int(data.get("deck_id", data.get("quiz_id")))
    daily_target = int(data.get("daily_target", 5))

    # Check if goal exists
    res = await db.execute(
        select(UserDeckGoal).filter(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id)
    )
    goal = res.scalar_one_or_none()
    if goal:
        goal.daily_target = daily_target
        goal.status = "active"
    else:
        goal = UserDeckGoal(
            user_id=user_id,
            deck_id=deck_id,
            daily_target=daily_target,
            status="active"
        )
        db.add(goal)
    
    await db.commit()
    return {"status": "ok", "goal_id": goal.id, "daily_target": goal.daily_target}

@router.get("/goals/active")
async def get_active_goals(request: Request, local_date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    # Always synchronize to UTC date
    local_date = datetime.utcnow().strftime("%Y-%m-%d")

    # Fetch active goals with joinedload of Deck to avoid N+1
    res = await db.execute(
        select(UserDeckGoal)
        .options(joinedload(UserDeckGoal.deck))
        .filter(UserDeckGoal.user_id == user_id, UserDeckGoal.status == "active")
    )
    goals = res.scalars().all()

    if not goals:
        return []

    goal_ids = [goal.id for goal in goals]
    deck_ids = [goal.deck_id for goal in goals]

    # Bulk query daily progress
    prog_res = await db.execute(
        select(UserDailyProgress).filter(
            UserDailyProgress.goal_id.in_(goal_ids),
            UserDailyProgress.date == local_date
        )
    )
    progress_map = {p.goal_id: p for p in prog_res.scalars().all()}

    # Calculate daily new cards count dynamically from UserAnswer to ensure consistency
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    first_answers = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("first_answered_at")
    ).join(
        DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
    ).where(
        DeckAttempt.user_id == user_id
    ).group_by(
        UserAnswer.card_id
    ).subquery()
    
    deck_progress_res = await db.execute(
        select(Flashcard.deck_id, func.count(first_answers.c.card_id))
        .join(Flashcard, Flashcard.id == first_answers.c.card_id)
        .where(
            first_answers.c.first_answered_at >= today
        )
        .group_by(Flashcard.deck_id)
    )
    deck_progress_map = {r[0]: r[1] for r in deck_progress_res.all()}

    # Bulk query total cards count grouped by deck_id
    c_count_res = await db.execute(
        select(Flashcard.deck_id, func.count(Flashcard.id))
        .filter(Flashcard.deck_id.in_(deck_ids))
        .group_by(Flashcard.deck_id)
    )
    c_count_map = {r[0]: r[1] for r in c_count_res.all()}

    # Bulk query ignored count grouped by deck_id via user_card_mastery
    ignored_res = await db.execute(
        select(Flashcard.deck_id, func.count(UserCardMastery.id))
        .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
        .filter(
            Flashcard.deck_id.in_(deck_ids),
            UserCardMastery.user_id == user_id,
            UserCardMastery.is_ignored == True
        )
        .group_by(Flashcard.deck_id)
    )
    ignored_map = {r[0]: r[1] for r in ignored_res.all()}

    # Bulk query learned count grouped by deck_id via user_card_mastery
    learned_res = await db.execute(
        select(Flashcard.deck_id, func.count(UserCardMastery.id))
        .join(UserCardMastery, UserCardMastery.card_id == Flashcard.id)
        .filter(
            Flashcard.deck_id.in_(deck_ids),
            UserCardMastery.user_id == user_id,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
        )
        .group_by(Flashcard.deck_id)
    )
    learned_map = {r[0]: r[1] for r in learned_res.all()}

    goals_data = []
    for goal in goals:
        deck = goal.deck
        if not deck:
            continue
            
        total_cards_raw = c_count_map.get(goal.deck_id, 0)
        ignored_count = ignored_map.get(goal.deck_id, 0)
        total_cards = max(0, total_cards_raw - ignored_count)
        total_learned = learned_map.get(goal.deck_id, 0)
        
        progress = progress_map.get(goal.id)
        done_today = deck_progress_map.get(goal.deck_id, 0)
        is_target_met = (progress.is_target_met if progress else False) or (done_today >= goal.daily_target)
        
        remaining_cs = max(0, total_cards - total_learned)
        days_remaining_est = math.ceil(remaining_cs / goal.daily_target) if goal.daily_target > 0 else 0
        
        goals_data.append({
            "goal_id": goal.id,
            "deck_id": goal.deck_id,
            "quiz_id": goal.deck_id, # compatibility
            "deck_title": deck.title,
            "quiz_title": deck.title, # compatibility
            "cover_image": deck.cover_image,
            "total_cards": total_cards,
            "total_questions": total_cards, # compatibility
            "total_learned": total_learned,
            "daily_target": goal.daily_target,
            "done_today": done_today,
            "is_target_met": is_target_met,
            "streak_count": goal.streak_count,
            "days_remaining_est": days_remaining_est
        })
        
    return goals_data

@router.post("/goals/remove")
async def remove_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    deck_id = int(data.get("deck_id", data.get("quiz_id")))
    
    await db.execute(
        delete(UserDeckGoal).where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id)
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/gamification/badges")
async def get_user_badges(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import UserGamification, Badge
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Get user gamification model
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    unlocked_badge_ids = set(user_gamify.badges or []) if user_gamify else set()
    
    # Get all badges
    badges_res = await db.execute(select(Badge))
    all_badges = badges_res.scalars().all()
    
    badges_list = []
    for badge in all_badges:
        is_unlocked = badge.id in unlocked_badge_ids
        progress = 0
        if is_unlocked:
            progress = 100
        else:
            if badge.id == "first_steps":
                ans_res = await db.execute(
                    select(func.count(UserAnswer.id)).join(DeckAttempt).where(DeckAttempt.user_id == user_id)
                )
                cnt = ans_res.scalar() or 0
                progress = min(100, int((cnt / 1) * 100))
            elif badge.id == "streak_starter":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 3) * 100))
            elif badge.id == "streak_legend":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 7) * 100))
            elif badge.id == "perfect_score":
                progress = 0
            elif badge.id == "speed_demon":
                fast_res = await db.execute(
                    select(func.count(UserAnswer.id))
                    .join(DeckAttempt)
                    .where(
                        DeckAttempt.user_id == user_id,
                        UserAnswer.is_correct == True,
                        UserAnswer.active_time <= 5.0,
                        UserAnswer.active_time > 0.0
                    )
                )
                cnt = fast_res.scalar() or 0
                progress = min(100, int((cnt / 5) * 100))
            elif badge.id == "goal_crusher":
                goals_res = await db.execute(
                    select(func.count(UserDailyProgress.id)).where(
                        UserDailyProgress.goal_id.in_(
                            select(UserDeckGoal.id).where(UserDeckGoal.user_id == user_id)
                        ),
                        UserDailyProgress.is_target_met == True
                    )
                )
                cnt = goals_res.scalar() or 0
                progress = min(100, int((cnt / 3) * 100))
            elif badge.id == "card_master":
                mastered_res = await db.execute(
                    select(func.count(UserCardMastery.id)).where(
                        UserCardMastery.user_id == user_id,
                        UserCardMastery.box_level == 5,
                        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
                    )
                )
                cnt = mastered_res.scalar() or 0
                progress = min(100, int((cnt / 10) * 100))

        badges_list.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "criteria_type": badge.criteria_type,
            "criteria_value": badge.criteria_value,
            "is_unlocked": is_unlocked,
            "progress": progress
        })
        
    return {
        "badges": badges_list,
        "total_unlocked": len(unlocked_badge_ids),
        "total_count": len(all_badges)
    }

@router.get("/stats/heatmap")
async def get_heatmap_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.stats.models import UserDailyStats
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=365)
    
    heatmap_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_date
    ).order_by(UserDailyStats.date)
    
    results = await db.execute(heatmap_stmt)
    data = []
    for row in results.all():
        day_val = row[0]
        if isinstance(day_val, str):
            date_str = day_val[:10]
        elif day_val:
            date_str = day_val.strftime("%Y-%m-%d")
        else:
            date_str = ""
            
        data.append({
            "date": date_str,
            "count": row[1] or 0
        })
        
    return data

@router.get("/stats/weekly-report")
async def get_weekly_report(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.stats.models import UserDailyStats
    from sqlalchemy import desc
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    
    # Current week (last 7 days)
    start_cur = today - timedelta(days=6)
    cur_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    )
    cur_res = (await db.execute(cur_stmt)).one_or_none()
    
    # Previous week (prior 7 days)
    start_prev = today - timedelta(days=13)
    end_prev = today - timedelta(days=7)
    prev_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_prev,
        UserDailyStats.date <= end_prev
    )
    prev_res = (await db.execute(prev_stmt)).one_or_none()
    
    cur_q = cur_res.total_q or 0 if cur_res and cur_res.total_q else 0
    cur_correct = cur_res.total_correct or 0 if cur_res and cur_res.total_correct else 0
    cur_time = cur_res.total_time or 0 if cur_res and cur_res.total_time else 0
    cur_accuracy = round((cur_correct / cur_q * 100), 1) if cur_q > 0 else 0
    
    prev_q = prev_res.total_q or 0 if prev_res and prev_res.total_q else 0
    prev_correct = prev_res.total_correct or 0 if prev_res and prev_res.total_correct else 0
    prev_accuracy = round((prev_correct / prev_q * 100), 1) if prev_q > 0 else 0
    
    # Calculate deltas
    q_delta = cur_q - prev_q
    q_pct_change = round((q_delta / prev_q * 100), 1) if prev_q > 0 else 100.0 if cur_q > 0 else 0.0
    accuracy_delta = round(cur_accuracy - prev_accuracy, 1)
    
    # Best active weekday in last 7 days
    best_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    ).order_by(desc(UserDailyStats.questions_attempted)).limit(1)
    best_res = (await db.execute(best_stmt)).first()
    
    best_day = "None"
    if best_res and best_res[0]:
        dt = best_res[0]
        if isinstance(dt, str):
            try:
                dt = datetime.strptime(dt[:10], "%Y-%m-%d")
            except Exception:
                pass
        if isinstance(dt, (datetime, date)):
            best_day = dt.strftime("%A")
        
    insights = []
    if cur_q == 0:
        insights = [
            "We noticed you haven't answered any questions this week. Set a simple goal of 5 cards today to kickstart your streak! 🚀",
            "Try studying at the same time each day to build a powerful long-term learning habit."
        ]
    else:
        insights.append(f"Awesome velocity! You attempted {cur_q} cards this week. Keep up this incredible momentum! 🔥")
        if accuracy_delta > 0:
            insights.append(f"Precision Boost! Your accuracy increased by {accuracy_delta}% compared to last week. Your retrieval speed is solid. 🎯")
        elif accuracy_delta < 0:
            insights.append("Focus Tip: Your accuracy fell slightly. Try turning on 'Incorrect Mistakes' learning mode to iron out weak cards. 🧠")
        else:
            insights.append("Great consistency! Your learning accuracy is holding perfectly steady. 📈")
            
        if cur_time > 1200:
            insights.append(f"Deep Focus: You spent {round(cur_time/60, 1)} minutes in deep study mode. Excellent focus stamina! ⏱️")
        else:
            insights.append("Habit Tip: Even 2 minutes of flashcard reviews daily triggers active recall and prevents forgetting! ⚡")
            
    return {
        "current_week": {
            "questions": cur_q,
            "accuracy": cur_accuracy,
            "time_minutes": round(cur_time / 60, 1)
        },
        "previous_week": {
            "questions": prev_q,
            "accuracy": prev_accuracy
        },
        "deltas": {
            "questions_change_pct": q_pct_change,
            "questions_change_absolute": q_delta,
            "accuracy_change": accuracy_delta
        },
        "best_day": best_day,
        "ai_insights": insights
    }

@router.get("/decks/{deck_id}/mastery")
@router.get("/quizzes/{deck_id}/mastery")
async def get_deck_mastery(deck_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Count total cards in the deck
    c_count_res = await db.execute(select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id))
    total_cards_raw = c_count_res.scalar() or 0
    
    # Count ignored cards in the deck
    ignored_res = await db.execute(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.is_ignored == True
        )
    )
    ignored_count = ignored_res.scalar() or 0
    total_cards = max(0, total_cards_raw - ignored_count)
    
    # Get all mastered cards for this deck
    mastery_stmt = select(
        UserCardMastery.box_level,
        func.count(UserCardMastery.id)
    ).join(Flashcard, UserCardMastery.card_id == Flashcard.id)\
     .where(
         Flashcard.deck_id == deck_id,
         UserCardMastery.user_id == user_id,
         or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
     )\
     .group_by(UserCardMastery.box_level)
     
    results = await db.execute(mastery_stmt)
    
    mastery_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in mastery_counts:
            mastery_counts[lvl] = row[1]
            
    unattempted = max(0, total_cards - sum(mastery_counts.values()))
    mastery_counts[1] += unattempted # Treat unattempted cards as Level 1 (New)
    
    return {
        "new": mastery_counts[1],
        "learning": mastery_counts[2],
        "familiar": mastery_counts[3] + mastery_counts[4],
        "mastered": mastery_counts[5],
        "total": total_cards
    }

@router.get("/stats/leitner")
async def get_global_leitner_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Query count of cards grouped by box_level
    stmt = select(
        UserCardMastery.box_level,
        func.count(UserCardMastery.id)
    ).where(
        UserCardMastery.user_id == user_id,
        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
    ).group_by(UserCardMastery.box_level)
    
    results = await db.execute(stmt)
    
    box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in box_counts:
            box_counts[lvl] = row[1]
            
    total_tracked = sum(box_counts.values())
    mastery_percentage = round((box_counts[5] / total_tracked * 100), 1) if total_tracked > 0 else 0
    
    # Get a list of the user's hardest cards (e.g. up to 5 cards in Box 1)
    hardest_cards_stmt = select(Flashcard)\
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)\
        .where(
            UserCardMastery.user_id == user_id,
            UserCardMastery.box_level == 1,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
        )\
        .limit(5)
        
    hardest_cards_res = await db.execute(hardest_cards_stmt)
    hardest_cards = [{
        "id": c.id,
        "content": c.content,
        "explanation": c.explanation,
        "deck_id": c.deck_id,
        "quiz_id": c.deck_id # compatibility
    } for c in hardest_cards_res.scalars().all()]
    
    return {
        "box_distribution": [
            {"box": 1, "count": box_counts[1], "label": "Box 1: Hard"},
            {"box": 2, "count": box_counts[2], "label": "Box 2: Learning"},
            {"box": 3, "count": box_counts[3], "label": "Box 3: Familiar"},
            {"box": 4, "count": box_counts[4], "label": "Box 4: Proficient"},
            {"box": 5, "count": box_counts[5], "label": "Box 5: Mastered"}
        ],
        "total_tracked": total_tracked,
        "mastery_percentage": mastery_percentage,
        "hardest_cards": hardest_cards
    }

@router.get("/stats/speed-accuracy")
async def get_speed_accuracy_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Run database-level aggregation to bin and summarize speeds
    stmt = select(
        func.sum(case((UserAnswer.active_time <= 3.0, 1), else_=0)).label("fast_total"),
        func.sum(case(((UserAnswer.active_time <= 3.0) & UserAnswer.is_correct, 1), else_=0)).label("fast_correct"),
        
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0), 1), else_=0)).label("optimal_total"),
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0) & UserAnswer.is_correct, 1), else_=0)).label("optimal_correct"),
        
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0), 1), else_=0)).label("calculated_total"),
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0) & UserAnswer.is_correct, 1), else_=0)).label("calculated_correct"),
        
        func.sum(case((UserAnswer.active_time > 15.0, 1), else_=0)).label("deep_total"),
        func.sum(case(((UserAnswer.active_time > 15.0) & UserAnswer.is_correct, 1), else_=0)).label("deep_correct"),
        
        func.sum(case((UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_correct"),
        func.sum(case((UserAnswer.is_correct, 1), else_=0)).label("count_correct"),
        
        func.sum(case((~UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_wrong"),
        func.sum(case((~UserAnswer.is_correct, 1), else_=0)).label("count_wrong"),
        
        func.count().label("total_answers_analyzed")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(DeckAttempt.user_id == user_id, UserAnswer.active_time > 0)
     
    results = await db.execute(stmt)
    row = results.first()
    
    # Safe fallback if there are no answers or SQLite returns all Nulls
    if not row or not row.total_answers_analyzed:
        return {
            "bins": [
                {"bin": "fast", "label": "Fast (0-3s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "optimal", "label": "Optimal (3-7s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "calculated", "label": "Calculated (7-15s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "deep", "label": "Deep (15s+)", "accuracy": 0.0, "total": 0, "correct": 0}
            ],
            "avg_speed_correct": 0.0,
            "avg_speed_wrong": 0.0,
            "total_answers_analyzed": 0
        }
        
    # Extract values
    fast_total = row.fast_total or 0
    fast_correct = row.fast_correct or 0
    optimal_total = row.optimal_total or 0
    optimal_correct = row.optimal_correct or 0
    calculated_total = row.calculated_total or 0
    calculated_correct = row.calculated_correct or 0
    deep_total = row.deep_total or 0
    deep_correct = row.deep_correct or 0
    
    sum_time_correct = row.sum_time_correct or 0.0
    count_correct = row.count_correct or 0
    sum_time_wrong = row.sum_time_wrong or 0.0
    count_wrong = row.count_wrong or 0
    total_answers_analyzed = row.total_answers_analyzed or 0
    
    bin_data = [
        {
            "bin": "fast",
            "label": "Fast (0-3s)",
            "accuracy": round((fast_correct / fast_total * 100), 1) if fast_total > 0 else 0.0,
            "total": fast_total,
            "correct": fast_correct
        },
        {
            "bin": "optimal",
            "label": "Optimal (3-7s)",
            "accuracy": round((optimal_correct / optimal_total * 100), 1) if optimal_total > 0 else 0.0,
            "total": optimal_total,
            "correct": optimal_correct
        },
        {
            "bin": "calculated",
            "label": "Calculated (7-15s)",
            "accuracy": round((calculated_correct / calculated_total * 100), 1) if calculated_total > 0 else 0.0,
            "total": calculated_total,
            "correct": calculated_correct
        },
        {
            "bin": "deep",
            "label": "Deep (15s+)",
            "accuracy": round((deep_correct / deep_total * 100), 1) if deep_total > 0 else 0.0,
            "total": deep_total,
            "correct": deep_correct
        }
    ]
    
    avg_speed_correct = round(sum_time_correct / count_correct, 1) if count_correct > 0 else 0.0
    avg_speed_wrong = round(sum_time_wrong / count_wrong, 1) if count_wrong > 0 else 0.0
    
    return {
        "bins": bin_data,
        "avg_speed_correct": avg_speed_correct,
        "avg_speed_wrong": avg_speed_wrong,
        "total_answers_analyzed": total_answers_analyzed
    }

@router.get("/goals/global")
async def get_global_goals(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id
    
    # 1. Get or create user global goals
    res = await db.execute(select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id))
    goal = res.scalar_one_or_none()
    if not goal:
        goal = UserGlobalGoal(user_id=user_id, daily_time_target=20, daily_card_target=20, daily_new_card_target=10)
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        
    # 2. Get today's stats (time and cards studied)
    from app.modules.stats.models import UserDailyStats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    stats_res = await db.execute(
        select(UserDailyStats).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= today
        ).order_by(UserDailyStats.date.desc())
    )
    stats = stats_res.scalars().first()
    
    # Convert seconds to minutes for daily time progress
    actual_seconds = stats.total_time_seconds if stats else 0
    actual_minutes = round(actual_seconds / 60, 1)
    
    actual_cards = stats.questions_attempted if stats else 0
    actual_correct = stats.correct_answers if stats else 0
    
    # 3. Calculate actual_new_cards_completed
    first_answers = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("first_answered_at")
    ).join(
        DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
    ).where(
        DeckAttempt.user_id == user_id
    ).group_by(
        UserAnswer.card_id
    ).subquery()

    stmt_new_cards = select(func.count(first_answers.c.card_id)).where(
        first_answers.c.first_answered_at >= today
    )
    new_cards_res = await db.execute(stmt_new_cards)
    actual_new_cards_completed = new_cards_res.scalar() or 0
    
    # 4. Calculate actual exact XP gained today
    from app.modules.gamification.models import XPTransaction
    stmt_xp = select(func.sum(XPTransaction.amount)).where(
        XPTransaction.user_id == user_id,
        XPTransaction.created_at >= today
    )
    xp_res = await db.execute(stmt_xp)
    actual_xp_gained_today = xp_res.scalar() or 0
    
    return {
        "daily_time_target": goal.daily_time_target,
        "daily_card_target": goal.daily_card_target,
        "daily_new_card_target": goal.daily_new_card_target,
        "actual_time_minutes": actual_minutes,
        "actual_cards_completed": actual_cards,
        "actual_new_cards_completed": actual_new_cards_completed,
        "actual_correct_answers": actual_correct,
        "actual_xp_gained_today": actual_xp_gained_today
    }

@router.post("/goals/global")
async def update_global_goals(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id
    
    daily_time_target = int(data.get("daily_time_target", 20))
    daily_card_target = int(data.get("daily_card_target", 20))
    daily_new_card_target = int(data.get("daily_new_card_target", 10))
    
    res = await db.execute(select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id))
    goal = res.scalar_one_or_none()
    if not goal:
        goal = UserGlobalGoal(
            user_id=user_id,
            daily_time_target=daily_time_target,
            daily_card_target=daily_card_target,
            daily_new_card_target=daily_new_card_target
        )
        db.add(goal)
    else:
        goal.daily_time_target = daily_time_target
        goal.daily_card_target = daily_card_target
        goal.daily_new_card_target = daily_new_card_target
        
    await db.commit()
    return {
        "status": "ok",
        "daily_time_target": goal.daily_time_target,
        "daily_card_target": goal.daily_card_target,
        "daily_new_card_target": goal.daily_new_card_target
    }

@router.get("/stats/review-forecast")
async def get_review_forecast(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Today's date in UTC
    now = datetime.utcnow()
    today = now.date()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)
    
    # Fetch all UserCardMastery records for this user that are not ignored
    stmt = select(UserCardMastery.due).where(
        UserCardMastery.user_id == user_id,
        or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
    )
    result = await db.execute(stmt)
    dues = result.scalars().all()
    
    # 1. Hourly (today's timeline): Grouped by hour (0 to 23). Overdue reviews go to Hour 0.
    hourly_counts = [0] * 24
    for due_dt in dues:
        if not due_dt:
            continue
        if due_dt < today_start:
            hourly_counts[0] += 1
        elif today_start <= due_dt < today_end:
            hourly_counts[due_dt.hour] += 1
            
    hourly_data = []
    hourly_cumulative = 0
    for h in range(24):
        hourly_cumulative += hourly_counts[h]
        hourly_data.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "count": hourly_counts[h],
            "cumulative": hourly_cumulative
        })
        
    # 2. Daily (next 30 days): Grouped by day. Overdue goes to Day 0 (Today).
    forecast_days = 30
    daily_counts = [0] * forecast_days
    for due_dt in dues:
        if not due_dt:
            continue
        due_date = due_dt.date()
        days_diff = (due_date - today).days
        
        if days_diff <= 0:
            daily_counts[0] += 1
        elif 0 < days_diff < forecast_days:
            daily_counts[days_diff] += 1
            
    daily_data = []
    daily_cumulative = 0
    for i in range(forecast_days):
        forecast_date = today + timedelta(days=i)
        date_str = forecast_date.strftime("%Y-%m-%d")
        
        if i == 0:
            label = "Hôm nay"
        elif i == 1:
            label = "Ngày mai"
        else:
            label = forecast_date.strftime("%d/%m")
            
        daily_cumulative += daily_counts[i]
        daily_data.append({
            "day_index": i,
            "date": date_str,
            "label": label,
            "count": daily_counts[i],
            "cumulative": daily_cumulative
        })
        
    # 3. Weekly (next 4 weeks): Grouped by week.
    weekly_data = []
    weekly_cumulative = 0
    for w in range(4):
        start_idx = w * 7
        end_idx = start_idx + 7
        w_count = sum(daily_counts[start_idx:end_idx])
        weekly_cumulative += w_count
        
        start_date = today + timedelta(days=start_idx)
        end_date = today + timedelta(days=end_idx - 1)
        
        label = f"Tuần {w+1}"
        date_range_str = f"{start_date.strftime('%d/%m')}-{end_date.strftime('%d/%m')}"
        
        weekly_data.append({
            "week_index": w,
            "label": label,
            "range": date_range_str,
            "count": w_count,
            "cumulative": weekly_cumulative
        })
        
    return {
        "hourly": hourly_data,
        "daily": daily_data,
        "weekly": weekly_data
    }

