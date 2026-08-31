from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_, and_, case
from sqlalchemy.orm import joinedload, selectinload
from app.core.db import get_db
from app.modules.deck.models import UserDeckSettings, FlashcardDeck, Flashcard, UserAnswer, DeckAttempt, UserCardMastery, UserDeckGoal, UserDailyProgress, UserPracticeStats
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
async def get_deck_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # 1. Overall accuracy for current user
    total_res = await db.execute(
        select(func.count(UserAnswer.id))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id)
    )
    total = total_res.scalar() or 0
    
    correct_res = await db.execute(
        select(func.count(UserAnswer.id))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id, UserAnswer.is_correct == True)
    )
    correct = correct_res.scalar() or 0
    
    accuracy = (correct / total * 100) if total > 0 else 0
    
    # 2. Activity by day (last 7 days) for current user
    activity_res = await db.execute(
        select(func.date(UserAnswer.created_at), func.count(UserAnswer.id))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id)
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
    user_id = AuthService.get_user_id(request)
    deck_id = int(data.get("deck_id", data.get("quiz_id")))
    daily_target = int(data.get("daily_target", data.get("daily_new_card_target", 5)))
    daily_time_target = int(data.get("daily_time_target", 10))
    daily_card_target = int(data.get("daily_card_target", 20))

    # Check if goal exists
    res = await db.execute(
        select(UserDeckGoal).filter(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id)
    )
    goal = res.scalar_one_or_none()
    if goal:
        goal.daily_target = daily_target
        goal.daily_time_target = daily_time_target
        goal.daily_card_target = daily_card_target
        goal.status = "active"
    else:
        goal = UserDeckGoal(
            user_id=user_id,
            deck_id=deck_id,
            daily_target=daily_target,
            daily_time_target=daily_time_target,
            daily_card_target=daily_card_target,
            status="active"
        )
        db.add(goal)
    
    await db.commit()
    return {
        "status": "ok", 
        "goal_id": goal.id, 
        "daily_target": goal.daily_target,
        "daily_time_target": goal.daily_time_target,
        "daily_card_target": goal.daily_card_target
    }

@router.get("/goals/active")
async def get_active_goals(request: Request, local_date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
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

    # Bulk query today's study time (seconds) grouped by deck_id for current user
    time_res = await db.execute(
        select(Flashcard.deck_id, func.sum(UserAnswer.active_time))
        .join(UserAnswer, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id, UserAnswer.created_at >= today)
        .group_by(Flashcard.deck_id)
    )
    deck_time_map = {r[0]: r[1] for r in time_res.all()}

    # Bulk query today's total card attempts grouped by deck_id for current user
    attempted_res = await db.execute(
        select(Flashcard.deck_id, func.count(UserAnswer.id))
        .join(UserAnswer, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(DeckAttempt.user_id == user_id, UserAnswer.created_at >= today)
        .group_by(Flashcard.deck_id)
    )
    deck_attempted_map = {r[0]: r[1] for r in attempted_res.all()}

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
        
        actual_time_seconds = deck_time_map.get(goal.deck_id, 0.0) or 0.0
        actual_time_minutes = round(actual_time_seconds / 60, 1)
        actual_cards_completed = deck_attempted_map.get(goal.deck_id, 0) or 0
        
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
            "daily_time_target": goal.daily_time_target,
            "daily_card_target": goal.daily_card_target,
            "daily_new_card_target": goal.daily_target,
            "actual_time_minutes": actual_time_minutes,
            "actual_cards_completed": actual_cards_completed,
            "actual_new_cards_completed": done_today,
            "done_today": done_today,
            "is_target_met": is_target_met,
            "streak_count": goal.streak_count,
            "days_remaining_est": days_remaining_est
        })
        
    return goals_data

@router.post("/goals/remove")
async def remove_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    deck_id = int(data.get("deck_id", data.get("quiz_id")))
    
    await db.execute(
        delete(UserDeckGoal).where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id)
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/gamification/badges")
async def get_user_badges(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import UserGamification, Badge, UserBadge
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Get user gamification model
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    ub_res = await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user_id))
    unlocked_badge_ids = set(r[0] for r in ub_res.all()).union(set(user_gamify.badges or []) if user_gamify else set())
    
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

@router.get("/{deck_id}/mastery")
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
    
    now_utc = datetime.utcnow()
    
    # Query all active UserCardMastery records for this user & deck
    mastery_stmt = select(
        UserCardMastery.box_level,
        UserCardMastery.state,
        UserCardMastery.stability,
        UserCardMastery.difficulty,
        UserCardMastery.due,
        UserCardMastery.last_review
    ).join(Flashcard, UserCardMastery.card_id == Flashcard.id)\
     .where(
         Flashcard.deck_id == deck_id,
         UserCardMastery.user_id == user_id,
         or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
     )
     
    results = await db.execute(mastery_stmt)
    rows = results.all()
    
    mastery_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    due_count = 0
    stabilities = []
    difficulties = []
    retentions = []
    
    learning_count = 0
    mastered_count = 0
    
    for row in rows:
        box_lvl = row[0] or 1
        state = row[1] or 0
        stab = row[2]
        diff = row[3]
        due_dt = row[4]
        last_rev = row[5]
        
        if box_lvl in mastery_counts:
            mastery_counts[box_lvl] += 1
            
        if due_dt and due_dt <= now_utc:
            due_count += 1
            
        if stab is not None and stab > 0:
            stabilities.append(stab)
            if last_rev:
                t_days = max(0.0, (now_utc - last_rev).total_seconds() / 86400.0)
                r_est = (1.0 + (19.0 / 81.0) * (t_days / max(0.1, stab))) ** (-0.5)
                retentions.append(min(1.0, max(0.0, r_est)))
            else:
                retentions.append(0.9)
                
        if diff is not None:
            difficulties.append(diff)
            
        if box_lvl >= 4 or (stab is not None and stab >= 21.0):
            mastered_count += 1
        elif box_lvl >= 2 or state in (1, 3) or (stab is not None and stab > 0):
            learning_count += 1
            
    tracked_count = len(rows)
    new_count = max(0, total_cards - (learning_count + mastered_count))
    mastery_counts[1] += max(0, total_cards - tracked_count)
    
    avg_stability = round(sum(stabilities) / len(stabilities), 1) if stabilities else None
    avg_difficulty = round(sum(difficulties) / len(difficulties), 1) if difficulties else None
    retention_rate = round(sum(retentions) / len(retentions), 2) if retentions else (0.9 if tracked_count > 0 else None)
    
    return {
        "new": new_count,
        "learning": learning_count,
        "familiar": mastery_counts[3] + mastery_counts[4],
        "mastered": mastered_count,
        "total": total_cards,
        "new_count": new_count,
        "learning_count": learning_count,
        "mastered_count": mastered_count,
        "due_count": due_count,
        "avg_stability": avg_stability,
        "avg_difficulty": avg_difficulty,
        "retention_rate": retention_rate,
        "tracked_count": tracked_count
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



@router.get("/stats/review-forecast")
async def get_review_forecast(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Today's date in UTC
    now = datetime.utcnow()
    today = now.date()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)
    
    # Fetch all UserCardMastery records for this user that are in review (state > 0) and not ignored
    stmt = select(UserCardMastery.due).where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.state > 0,
        UserCardMastery.last_review.isnot(None),
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


@router.get("/question/{card_id}/detailed-stats")
async def get_card_detailed_stats(request: Request, card_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        user_id = 1

    # 1. Fetch card and mastery
    card_stmt = select(Flashcard).where(Flashcard.id == card_id)
    mastery_stmt = select(UserCardMastery).where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.card_id == card_id
    )

    card_res = await db.execute(card_stmt)
    card = card_res.scalar_one_or_none()
    if not card:
        return JSONResponse(status_code=404, content={"error": "Card not found"})

    mastery_res = await db.execute(mastery_stmt)
    mastery = mastery_res.scalar_one_or_none()

    # 2. Fetch answer logs from UserAnswer
    answers_stmt = select(UserAnswer).join(
        DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
    ).where(
        DeckAttempt.user_id == user_id,
        UserAnswer.card_id == card_id
    ).order_by(UserAnswer.created_at.desc())

    answers_res = await db.execute(answers_stmt)
    answers = answers_res.scalars().all()

    total_reviews = len(answers)
    total_time_seconds = sum(a.active_time or 0.0 for a in answers)
    avg_time_seconds = (total_time_seconds / total_reviews) if total_reviews > 0 else 0.0
    correct_count = sum(1 for a in answers if a.is_correct)
    accuracy_percent = round((correct_count / total_reviews * 100), 1) if total_reviews > 0 else 0

    again_count = sum(1 for a in answers if a.rating == 1)
    hard_count = sum(1 for a in answers if a.rating == 2)
    good_count = sum(1 for a in answers if a.rating == 3)
    easy_count = sum(1 for a in answers if a.rating == 4)

    # 3. Calculate FSRS retrievability if stability is known
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    stability = mastery.stability if (mastery and mastery.stability) else None
    difficulty = mastery.difficulty if (mastery and mastery.difficulty) else None
    state = mastery.state if mastery else 0
    box_level = mastery.box_level if mastery else 1
    last_review = mastery.last_review.replace(tzinfo=timezone.utc) if (mastery and mastery.last_review) else None
    first_learned = mastery.last_answered.replace(tzinfo=timezone.utc) if (mastery and mastery.last_answered) else None
    due = mastery.due.replace(tzinfo=timezone.utc) if (mastery and mastery.due) else now_utc

    retrievability = None
    if stability and last_review and state == 2:
        elapsed_days = max(0.0, (now_utc - last_review).total_seconds() / 86400.0)
        # Standard FSRS retrievability formula: R = (1 + 19/81 * t / S)^-0.5
        retrievability = round(math.pow(1.0 + (19.0 / 81.0) * (elapsed_days / max(0.1, stability)), -0.5) * 100, 1)

    state_labels = {0: "Mới (New)", 1: "Đang học (Learning)", 2: "Ôn tập (Review)", 3: "Học lại (Relearning)"}

    # Format review history list
    history_logs = [{
        "id": a.id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "rating": a.rating,
        "is_correct": a.is_correct,
        "active_time": round(a.active_time or 0.0, 1)
    } for a in answers[:30]]

    return {
        "card_id": card.id,
        "deck_id": card.deck_id,
        "content": card.content,
        "explanation": card.explanation,
        "box_level": box_level,
        "consecutive_correct": mastery.consecutive_correct if mastery else 0,
        "is_ignored": mastery.is_ignored if mastery else False,
        "is_starred": mastery.is_starred if mastery else False,
        "fsrs": {
            "state": state,
            "state_label": state_labels.get(state, "Mới"),
            "stability": stability,
            "difficulty": difficulty,
            "retrievability": retrievability,
            "due": due.isoformat() if due else None,
            "last_review": last_review.isoformat() if last_review else None,
            "first_learned": first_learned.isoformat() if first_learned else None,
        },
        "reviews_summary": {
            "total_reviews": total_reviews,
            "correct_count": correct_count,
            "accuracy_percent": accuracy_percent,
            "total_time_seconds": round(total_time_seconds, 1),
            "avg_time_seconds": round(avg_time_seconds, 1),
            "again_count": again_count,
            "hard_count": hard_count,
            "good_count": good_count,
            "easy_count": easy_count,
            "again_percent": round((again_count / total_reviews * 100), 1) if total_reviews > 0 else 0,
            "hard_percent": round((hard_count / total_reviews * 100), 1) if total_reviews > 0 else 0,
            "good_percent": round((good_count / total_reviews * 100), 1) if total_reviews > 0 else 0,
            "easy_percent": round((easy_count / total_reviews * 100), 1) if total_reviews > 0 else 0,
        },
        "history_logs": history_logs
    }


@router.get("/{deck_id}/overview-stats")
async def get_deck_overview_stats(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    if not user_id:
        user_id = 1

    # 1. Fetch deck with cards
    deck_stmt = select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(selectinload(FlashcardDeck.cards))
    deck_res = await db.execute(deck_stmt)
    deck = deck_res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})

    total_cards = len(deck.cards)
    card_ids = [c.id for c in deck.cards]

    # 2. Parallel queries: mastery records & historical answer stats
    mastery_stmt = select(UserCardMastery).where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.card_id.in_(card_ids)
    )

    deck_answers_stmt = select(
        func.count(UserAnswer.id).label("total_reviews"),
        func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct_count"),
        func.sum(UserAnswer.active_time).label("total_active_time"),
        func.count(func.distinct(func.date(UserAnswer.created_at))).label("active_days"),
        func.min(UserAnswer.created_at).label("first_studied_at"),
        func.max(UserAnswer.created_at).label("last_studied_at")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(
        DeckAttempt.user_id == user_id,
        UserAnswer.card_id.in_(card_ids)
    )

    mastery_res = await db.execute(mastery_stmt)
    answers_res = await db.execute(deck_answers_stmt)

    mastery_list = mastery_res.scalars().all()
    answer_stats = answers_res.first()

    total_reviews = answer_stats.total_reviews or 0
    correct_count = answer_stats.correct_count or 0
    total_time_seconds = float(answer_stats.total_active_time or 0.0)
    active_days = max(1, answer_stats.active_days or 1) if total_reviews > 0 else 0
    accuracy_percent = round((correct_count / total_reviews * 100), 1) if total_reviews > 0 else 0

    # 3. Box & FSRS Breakdown
    box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    now_utc = datetime.utcnow()
    mastered_count = 0
    learning_count = 0
    new_count = 0
    due_count = 0

    mastery_map = {m.card_id: m for m in mastery_list}
    for c in deck.cards:
        m = mastery_map.get(c.id)
        b_level = m.box_level if m else 1
        b_level = max(1, min(5, b_level))
        box_counts[b_level] += 1

        if b_level == 5:
            mastered_count += 1
        elif m and m.state != 0 and m.last_review:
            learning_count += 1
        else:
            new_count += 1

        if m and m.due and m.due <= now_utc and not m.is_ignored and (m.state != 0 or m.last_review):
            due_count += 1

    learned_total = total_cards - new_count
    avg_new_per_day = round(learned_total / active_days, 1) if active_days > 0 else 0
    avg_reviews_per_day = round(total_reviews / active_days, 1) if active_days > 0 else 0

    mastery_percentage = round((mastered_count / total_cards * 100), 1) if total_cards > 0 else 0

    return {
        "deck_id": deck.id,
        "title": deck.title,
        "total_cards": total_cards,
        "active_days": active_days,
        "total_study_time_seconds": round(total_time_seconds, 1),
        "total_reviews": total_reviews,
        "overall_accuracy": accuracy_percent,
        "avg_new_cards_per_day": avg_new_per_day,
        "avg_reviews_per_day": avg_reviews_per_day,
        "first_studied_at": answer_stats.first_studied_at.isoformat() if (answer_stats and answer_stats.first_studied_at) else None,
        "last_studied_at": answer_stats.last_studied_at.isoformat() if (answer_stats and answer_stats.last_studied_at) else None,
        "box_distribution": {
            "1": {"count": box_counts[1], "percent": round(box_counts[1] / total_cards * 100, 1) if total_cards > 0 else 0},
            "2": {"count": box_counts[2], "percent": round(box_counts[2] / total_cards * 100, 1) if total_cards > 0 else 0},
            "3": {"count": box_counts[3], "percent": round(box_counts[3] / total_cards * 100, 1) if total_cards > 0 else 0},
            "4": {"count": box_counts[4], "percent": round(box_counts[4] / total_cards * 100, 1) if total_cards > 0 else 0},
            "5": {"count": box_counts[5], "percent": round(box_counts[5] / total_cards * 100, 1) if total_cards > 0 else 0},
        },
        "fsrs_distribution": {
            "mastered": mastered_count,
            "learning": learning_count,
            "new": new_count,
            "due_today": due_count
        },
        "mastery_percentage": mastery_percentage
    }


