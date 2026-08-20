from app.modules.deck.models import UserDeckSettings
from fastapi import APIRouter, Depends, Request, Query, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService

router = APIRouter(tags=['Roadmap'])

async def get_deck_roadmap_status_helper(db: AsyncSession, user_id: int, deck_id: int, settings: dict, target_date_str: Optional[str] = None) -> dict:
    from app.modules.deck.models import FlashcardDeck, Flashcard, UserCardMastery, UserAnswer, DeckAttempt, UserDeckGoal, UserDailyProgress, DeckSession
    deck_obj = await db.get(FlashcardDeck, deck_id)
    deck_practice_settings = deck_obj.practice_settings if (deck_obj and isinstance(deck_obj.practice_settings, dict)) else {}

    raw_pipeline = settings.get("pipeline")
    roadmap_active = settings.get("roadmap_active", False) and isinstance(raw_pipeline, list) and len(raw_pipeline) > 0
    pipeline_input = raw_pipeline if isinstance(raw_pipeline, list) else []
    
    total_cards = await db.scalar(
        select(func.count(Flashcard.id)).where(Flashcard.deck_id == deck_id)
    ) or 0
    
    learned_cards = await db.scalar(
        select(func.count(UserCardMastery.id))
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0
        )
    ) or 0
    
    unlearned_cards = max(0, total_cards - learned_cards)

    if target_date_str:
        try:
            target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
        except Exception:
            target_dt = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        target_dt = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    day_start = target_dt
    day_end = target_dt + timedelta(days=1)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
     )\
     .group_by(UserAnswer.card_id).subquery()
    
    new_learned_today = await db.scalar(
        select(func.count(min_answer_sub.c.card_id))
        .join(Flashcard, min_answer_sub.c.card_id == Flashcard.id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created >= day_start,
            min_answer_sub.c.min_created < day_end
        )
    ) or 0
    
    fsrs_overdue_hours = 24
    for st in pipeline_input:
        if st.get("type") == "fsrs_review":
            fsrs_overdue_hours = int(st.get("overdue_hours", 24))
            break

    now_utc = datetime.utcnow()
    # cutoff = day_end - overdue_hours → card is due if (end_of_today - card.due) >= overdue_hours
    # With overdue_hours=24: cutoff = day_start (00:00 UTC today). Fixed for the entire day.
    cutoff_time = day_end - timedelta(hours=fsrs_overdue_hours)

    from sqlalchemy import or_, and_, case
    # Combine review_completed_today and review_still_due into one query
    review_stats_res = await db.execute(
        select(
            func.count(case((
                and_(
                    UserCardMastery.last_review >= day_start,
                    UserCardMastery.last_review < day_end,
                    or_(
                        min_answer_sub.c.min_created == None,
                        min_answer_sub.c.min_created < day_start
                    ),
                    or_(
                        UserCardMastery.last_due == None,
                        UserCardMastery.last_due <= cutoff_time,
                        UserCardMastery.due <= cutoff_time
                    )
                ), 1
            ))).label("completed"),
            func.count(case((
                UserCardMastery.due <= cutoff_time, 1
            ))).label("still_due")
        )
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .outerjoin(min_answer_sub, UserCardMastery.card_id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.state > 0
        )
    )
    rev_row = review_stats_res.first()
    review_completed_today = rev_row[0] if rev_row and rev_row[0] else 0
    review_still_due = rev_row[1] if rev_row and rev_row[1] else 0
    # Total due at start of target day = cards currently due + cards reviewed today
    review_due_today = review_still_due + review_completed_today

    # Calculate target day's total active study time in minutes and answers count
    ans_res = await db.execute(
        select(
            func.sum(UserAnswer.active_time).label("time_seconds"),
            func.count(UserAnswer.id).label("answers_count")
        )
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(
            Flashcard.deck_id == deck_id,
            DeckAttempt.user_id == user_id,
            UserAnswer.created_at >= day_start,
            UserAnswer.created_at < day_end
        )
    )
    ans_row = ans_res.first()
    today_time_seconds = ans_row[0] if ans_row and ans_row[0] else 0.0
    today_studied_minutes = round(float(today_time_seconds) / 60.0, 1)
    answers_count_today = ans_row[1] if ans_row and ans_row[1] else 0

    # Calculate attempts counts and latest activity time
    att_res = await db.execute(
        select(
            func.count(case((DeckAttempt.mode.in_(["roadmap_mcq", "mcq", "roadmap_test", "practice", "listening"]), 1))).label("mcq"),
            func.count(case((DeckAttempt.mode.in_(["roadmap_typing", "typing", "practice"]), 1))).label("typing"),
            func.max(func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at)).label("latest_activity")
        ).where(
            DeckAttempt.user_id == user_id,
            DeckAttempt.deck_id == deck_id,
            func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= day_start,
            func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) < day_end
        )
    )
    att_row = att_res.first()
    mcq_attempts_count_today = att_row[0] if att_row and att_row[0] else 0
    typing_attempts_count_today = att_row[1] if att_row and att_row[1] else 0
    latest_activity_dt = att_row[2] if att_row and att_row[2] else None
    completion_time_today = latest_activity_dt.strftime("%H:%M:%S") if latest_activity_dt else None

    # Calculate Retention Rate from recent test attempts (roadmap_test, roadmap_mcq, roadmap_typing)
    test_attempts_res = await db.execute(
        select(DeckAttempt.score)
        .where(
            DeckAttempt.user_id == user_id,
            DeckAttempt.deck_id == deck_id,
            DeckAttempt.mode.in_(["roadmap_test", "roadmap_mcq", "roadmap_typing"])
        )
        .order_by(DeckAttempt.started_at.desc())
        .limit(10)
    )
    test_scores = test_attempts_res.scalars().all()
    retention_rate = int(round(sum(test_scores) / len(test_scores))) if test_scores else 0

    today_date = datetime.utcnow().date()
    seven_days = []
    
    goal_res = await db.execute(select(UserDeckGoal).where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id))
    goal = goal_res.scalar_one_or_none()
    
    prog = None
    if goal:
        prog_res = await db.execute(
            select(UserDailyProgress).where(
                UserDailyProgress.goal_id == goal.id,
                UserDailyProgress.date == target_date_str
            )
        )
        prog = prog_res.scalar_one_or_none()

        past_7_dates = [(today_date - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
        progress_res = await db.execute(
            select(UserDailyProgress.date, UserDailyProgress.is_target_met, UserDailyProgress.is_rescued)
            .where(UserDailyProgress.goal_id == goal.id, UserDailyProgress.date.in_(past_7_dates))
        )
        progress_map = {row[0]: {"is_target_met": row[1], "is_rescued": getattr(row, "is_rescued", False)} for row in progress_res.all()}
    else:
        progress_map = {}
        
    for i in range(6, -1, -1):
        d = today_date - timedelta(days=i)
        d_str = d.isoformat()
        d_info = progress_map.get(d_str, {"is_target_met": False, "is_rescued": False})
        seven_days.append({
            "date": d_str,
            "day_name": d.strftime("%a"),
            "active": d_info["is_target_met"],
            "rescued": d_info.get("is_rescued", False)
        })

    pipeline_processed = []
    first_incomplete_idx = None
    daily_new_target = 0

    for idx, st in enumerate(pipeline_input):
        stype = st.get("type")
        step_data = {
            "type": stype,
            "done": False,
            "progress": {},
            "url": "",
            "label": ""
        }

        if stype == "new_cards":
            daily_count = int(st.get("daily_count", 10))
            daily_new_target = daily_count
            is_done = new_learned_today >= daily_count
            step_data.update({
                "daily_count": daily_count,
                "done": is_done,
                "progress": {"learned": new_learned_today, "target": daily_count},
                "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                "label": "Học từ mới"
            })
        elif stype == "fsrs_review":
            overdue_hours = int(st.get("overdue_hours", 24))
            is_done = (review_due_today <= 0) or (review_completed_today >= review_due_today)
            step_data.update({
                "overdue_hours": overdue_hours,
                "done": is_done,
                "progress": {"due_count": review_due_today, "reviewed_today": review_completed_today},
                "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                "label": "Ôn tập FSRS"
            })
        elif stype == "mcq":
            q_count = int(st.get("question_count") or daily_new_target or 20)
            threshold = int(st.get("pass_threshold", 80))
            mcq_res = await db.execute(
                select(DeckAttempt.score)
                .where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.deck_id == deck_id,
                    DeckAttempt.mode.in_(["roadmap_mcq", "roadmap_test", "mcq", "practice", "listening"]),
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= day_start,
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) < day_end
                )
            )
            mcq_scores = mcq_res.scalars().all()
            best_score = max(mcq_scores) if mcq_scores else 0
            is_done = any(s >= threshold for s in mcq_scores)
            
            mcq_answers_today = await db.scalar(
                select(func.count(UserAnswer.id))
                .join(Flashcard, UserAnswer.card_id == Flashcard.id)
                .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                .where(
                    Flashcard.deck_id == deck_id,
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.mode.in_(["roadmap_mcq", "roadmap_test", "mcq", "practice", "listening"]),
                    UserAnswer.created_at >= day_start,
                    UserAnswer.created_at < day_end
                )
            ) or 0

            step_data.update({
                "question_count": q_count,
                "pass_threshold": threshold,
                "done": is_done,
                "progress": {
                    "best_score": best_score, 
                    "attempts_today": len(mcq_scores), 
                    "target_score": threshold,
                    "answered_today": mcq_answers_today,
                    "target_count": q_count
                },
                "url": f"/practice/{deck_id}/roadmap_mcq",
                "label": "Trắc nghiệm MCQ"
            })
        elif stype == "typing":
            q_count = int(st.get("question_count") or daily_new_target or 20)
            threshold = int(st.get("pass_threshold", 70))
            typing_res = await db.execute(
                select(DeckAttempt.score)
                .where(
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.deck_id == deck_id,
                    DeckAttempt.mode.in_(["roadmap_typing", "typing", "practice"]),
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) >= day_start,
                    func.coalesce(DeckAttempt.completed_at, DeckAttempt.started_at) < day_end
                )
            )
            typing_scores = typing_res.scalars().all()
            best_score = max(typing_scores) if typing_scores else 0
            is_done = any(s >= threshold for s in typing_scores)

            typing_answers_today = await db.scalar(
                select(func.count(UserAnswer.id))
                .join(Flashcard, UserAnswer.card_id == Flashcard.id)
                .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
                .where(
                    Flashcard.deck_id == deck_id,
                    DeckAttempt.user_id == user_id,
                    DeckAttempt.mode.in_(["roadmap_typing", "typing", "practice"]),
                    UserAnswer.created_at >= day_start,
                    UserAnswer.created_at < day_end
                )
            ) or 0

            step_data.update({
                "question_count": q_count,
                "pass_threshold": threshold,
                "done": is_done,
                "progress": {
                    "best_score": best_score, 
                    "attempts_today": len(typing_scores), 
                    "target_score": threshold,
                    "answered_today": typing_answers_today,
                    "target_count": q_count
                },
                "url": f"/practice/{deck_id}/roadmap_typing",
                "label": "Gõ từ vựng"
            })
        elif stype == "study_time":
            target_mins = int(st.get("target_minutes", 10))
            is_done = today_studied_minutes >= target_mins
            step_data.update({
                "target_minutes": target_mins,
                "done": is_done,
                "progress": {"studied_minutes": today_studied_minutes, "target_minutes": target_mins},
                "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                "label": f"Thời gian học ({target_mins} phút)"
            })

        if prog and getattr(prog, 'is_rescued', False):
            step_data["done"] = True

        pipeline_processed.append(step_data)
        if not step_data["done"] and first_incomplete_idx is None:
            first_incomplete_idx = idx

    import math
    if daily_new_target > 0:
        days_left = math.ceil(unlearned_cards / daily_new_target)
        estimated_completion_date = (datetime.utcnow() + timedelta(days=days_left)).strftime("%Y-%m-%d")
    else:
        days_left = 0
        estimated_completion_date = None

    has_activity_today = (
        new_learned_today > 0 or 
        review_completed_today > 0 or 
        answers_count_today > 0 or 
        today_studied_minutes > 0 or 
        mcq_attempts_count_today > 0 or 
        typing_attempts_count_today > 0
    )
    all_cards_learned = (total_cards > 0 and unlearned_cards == 0)

    if len(pipeline_processed) > 0:
        steps_all_done = all(step.get("done", False) for step in pipeline_processed)
        is_rescued = (prog is not None and getattr(prog, 'is_rescued', False))
        all_done = is_rescued or (steps_all_done and (has_activity_today or all_cards_learned))
    else:
        all_done = False
        
    streak = 0
    today_str = today_date.isoformat()
    yesterday_str = (today_date - timedelta(days=1)).isoformat()
    
    if not goal:
        goal = UserDeckGoal(user_id=user_id, deck_id=deck_id, streak_count=0)
        db.add(goal)
        await db.flush()

    if not target_date_str:
        prog_res = await db.execute(select(UserDailyProgress).where(UserDailyProgress.goal_id == goal.id, UserDailyProgress.date == today_str))
        prog = prog_res.scalar_one_or_none()
        
        if not prog:
            prog = UserDailyProgress(goal_id=goal.id, date=today_str, is_target_met=all_done)
            db.add(prog)
        else:
            if not getattr(prog, 'is_rescued', False):
                prog.is_target_met = all_done
            
        if all_done:
            goal.last_completed_date = today_str

    # Calculate exact consecutive active streak for this deck goal from UserDailyProgress
    all_progs_res = await db.execute(
        select(UserDailyProgress.date)
        .where(UserDailyProgress.goal_id == goal.id, UserDailyProgress.is_target_met == True)
        .order_by(UserDailyProgress.date.desc())
    )
    met_date_strings = all_progs_res.scalars().all()
    met_dates = []
    for d_str in met_date_strings:
        try:
            d_obj = date.fromisoformat(d_str)
            if d_obj == today_date and not all_done:
                continue
            met_dates.append(d_obj)
        except Exception:
            pass

    if not met_dates:
        streak = 0
    else:
        most_recent = met_dates[0]
        if most_recent != today_date and most_recent != (today_date - timedelta(days=1)):
            streak = 0
        else:
            streak = 1
            curr = most_recent
            for d in met_dates[1:]:
                diff = (curr - d).days
                if diff == 1:
                    streak += 1
                    curr = d
                elif diff == 0:
                    continue
                else:
                    break

    goal.streak_count = streak
    if not target_date_str:
        await db.flush()

    if len(pipeline_processed) > 0 and first_incomplete_idx is None:
        current_step_index = len(pipeline_processed)
        next_action_url = f"/flashcard/{deck_id}/roadmap"
        next_action_label = "Đã xong lộ trình hôm nay"
    elif len(pipeline_processed) > 0:
        current_step_index = first_incomplete_idx
        next_action_url = pipeline_processed[first_incomplete_idx]["url"]
        next_action_label = pipeline_processed[first_incomplete_idx]["label"]
    else:
        all_done = False
        current_step_index = 0
        next_action_url = f"/flashcard/{deck_id}/roadmap"
        next_action_label = "Chưa thiết lập lộ trình"

    new_cards_step = next((st for st in pipeline_processed if st.get("type") == "new_cards"), None)
    stage_1_done = new_cards_step["done"] if new_cards_step else True
    roadmap_daily_new = new_cards_step.get("daily_count", 10) if new_cards_step else 10

    test_step = next((st for st in pipeline_processed if st.get("type") in ("mcq", "typing")), None)
    stage_2_done = test_step["done"] if test_step else False
    roadmap_pass_threshold = test_step.get("pass_threshold", 80) if test_step else 80

    return {
        "deck_title": deck_obj.title if deck_obj else None,
        "roadmap_active": roadmap_active,
        "pipeline": pipeline_processed,
        "current_step_index": current_step_index,
        "all_done": all_done,
        "next_action_url": next_action_url,
        "next_action_label": next_action_label,
        "stage_1_done": stage_1_done,
        "stage_2_done": stage_2_done,
        "new_learned_today": new_learned_today,
        "new_target_today": roadmap_daily_new,
        "review_completed_today": review_completed_today,
        "review_due_today": review_due_today,
        "roadmap_daily_new": roadmap_daily_new,
        "roadmap_pass_threshold": roadmap_pass_threshold,
        "total_cards": total_cards,
        "learned_cards": learned_cards,
        "unlearned_cards": unlearned_cards,
        "days_left": days_left,
        "estimated_completion_date": estimated_completion_date,
        "retention_rate": retention_rate,
        "streak": streak,
        "seven_days": seven_days,
        "today_total_study_minutes": today_studied_minutes,
        "completion_time_today": completion_time_today,
        "today_activity": {
            "new_learned": new_learned_today,
            "reviewed": review_completed_today,
            "answers_count": answers_count_today,
            "mcq_attempts": mcq_attempts_count_today,
            "typing_attempts": typing_attempts_count_today
        }
    }


@router.get("/roadmap/decks")
async def get_roadmap_decks(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    from app.modules.deck.models import FlashcardDeck, UserDeckSettings
    
    # STRICT: Only show decks where user has EXPLICITLY set roadmap_active=True in their UserDeckSettings
    user_setts_res = await db.execute(
        select(UserDeckSettings).where(UserDeckSettings.user_id == user_id)
    )
    
    active_roadmaps = []
    active_deck_ids = []
    user_setts_map = {}
    
    for sett in user_setts_res.scalars().all():
        s = sett.settings or {}
        user_setts_map[sett.deck_id] = s
        # Only include if roadmap_active is EXPLICITLY True — no fallbacks
        if s.get("roadmap_active") is True:
            active_deck_ids.append(sett.deck_id)
    
    if active_deck_ids:
        decks_res = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id.in_(active_deck_ids))
        )
        decks = decks_res.scalars().all()
        
        from .media_resolver import get_sso_server_url, resolve_central_url
        sso_url = await get_sso_server_url(db)

        for deck in decks:
            u_sett = user_setts_map.get(deck.id, {})
            creator_sett = deck.practice_settings if isinstance(deck.practice_settings, dict) else {}
            merged_settings = {**creator_sett, **u_sett, "roadmap_active": True}
            status = await get_deck_roadmap_status_helper(db, user_id, deck.id, merged_settings)
            cover_image = resolve_central_url(deck.cover_image, sso_url) if deck.cover_image else None
            active_roadmaps.append({
                "deck_id": deck.id,
                "title": deck.title,
                "description": deck.description,
                "cover_image": cover_image,
                "status": status
            })

    return {"decks": active_roadmaps}


async def get_deck_streak_for_user(db: AsyncSession, user_id: int, deck_id: int) -> int:
    from datetime import datetime, date, timedelta
    from app.modules.deck.models import UserAnswer, Flashcard, DeckAttempt
    from sqlalchemy import select, func
    
    active_dates_res = await db.execute(
        select(func.date(UserAnswer.created_at))
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .where(
            DeckAttempt.user_id == user_id,
            Flashcard.deck_id == deck_id
        )
        .group_by(func.date(UserAnswer.created_at))
        .order_by(func.date(UserAnswer.created_at).desc())
    )
    active_dates = []
    for row in active_dates_res.all():
        val = row[0]
        if not val:
            continue
        if isinstance(val, str):
            try:
                active_dates.append(date.fromisoformat(val))
            except Exception:
                pass
        elif isinstance(val, datetime):
            active_dates.append(val.date())
        elif isinstance(val, date):
            active_dates.append(val)

    if not active_dates:
        return 0
        
    today_date = datetime.utcnow().date()
    yesterday_date = today_date - timedelta(days=1)
    if active_dates[0] != today_date and active_dates[0] != yesterday_date:
        return 0
        
    streak = 1
    current_date = active_dates[0]
    for date_val in active_dates[1:]:
        if (current_date - date_val).days == 1:
            streak += 1
            current_date = date_val
        elif (current_date - date_val).days == 0:
            continue
        else:
            break
            
    return streak





@router.get("/{deck_id}/leaderboard")
async def get_deck_leaderboard(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Get top users studying this deck with their learned cards count, deck streak, and rank."""
    from app.modules.auth.models import User
    from app.modules.gamification.models import UserGamification
    from app.modules.deck.models import Flashcard, UserCardMastery
    from sqlalchemy import case
    
    current_user_id = AuthService.get_user_id(request)
    
    stmt = (
        select(
            User.id.label("user_id"),
            User.username,
            User.full_name,
            func.count(func.distinct(case((UserCardMastery.state > 0, UserCardMastery.card_id)))).label("learned_cards"),
            func.coalesce(UserGamification.xp, 0).label("xp")
        )
        .join(UserCardMastery, User.id == UserCardMastery.user_id)
        .join(Flashcard, UserCardMastery.card_id == Flashcard.id)
        .outerjoin(UserGamification, UserGamification.user_id == User.id)
        .where(
            Flashcard.deck_id == deck_id
        )
        .group_by(User.id, User.username, User.full_name, UserGamification.xp)
        .order_by(
            func.count(func.distinct(case((UserCardMastery.state > 0, UserCardMastery.card_id)))).desc(),
            func.coalesce(UserGamification.xp, 0).desc()
        )
        .limit(20)
    )
    
    res = await db.execute(stmt)
    rows = res.all()
    
    leaderboard = []
    for rank, r in enumerate(rows, start=1):
        deck_streak = await get_deck_streak_for_user(db, r.user_id, deck_id)
        leaderboard.append({
            "rank": rank,
            "user_id": r.user_id,
            "username": r.full_name or r.username or f"Người học #{r.user_id}",
            "avatar": None,
            "learned_cards": r.learned_cards or 0,
            "streak": deck_streak,
            "xp": r.xp or 0,
            "is_current_user": r.user_id == current_user_id
        })
        
    return {"leaderboard": leaderboard}


@router.get("/{deck_id}/roadmap-status")
async def get_deck_roadmap_status(request: Request, deck_id: int, target_date: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    
    status = await get_deck_roadmap_status_helper(db, user_id, deck_id, settings, target_date_str=target_date)
    return status


@router.get("/{deck_id}/roadmap-calendar")
async def get_deck_roadmap_calendar(request: Request, deck_id: int, month: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Get calendar heatmap data for a month. month format: YYYY-MM"""
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import Flashcard, DeckAttempt, UserAnswer, UserDeckGoal, UserDailyProgress
    import calendar as cal_mod
    
    try:
        year, month_num = int(month.split("-")[0]), int(month.split("-")[1])
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid month format. Use YYYY-MM."})
    
    _, days_in_month = cal_mod.monthrange(year, month_num)
    
    from app.modules.deck.models import UserDeckGoal
    goal_res = await db.execute(
        select(UserDeckGoal).where(
            UserDeckGoal.user_id == user_id,
            UserDeckGoal.deck_id == deck_id
        )
    )
    deck_goal = goal_res.scalar_one_or_none()
    daily_card_target = deck_goal.daily_card_target if (deck_goal and deck_goal.daily_card_target) else 20
    
    # Get user's roadmap pipeline settings for this deck
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    pipeline = settings.get("pipeline", [])
    # Get all active dates in this month for this deck
    month_start = datetime(year, month_num, 1)
    month_end = datetime(year, month_num, days_in_month, 23, 59, 59)

    month_start_str = month_start.strftime("%Y-%m-%d")
    month_end_str = month_end.strftime("%Y-%m-%d")
    progress_records_map = {}
    if deck_goal:
        progress_res = await db.execute(
            select(UserDailyProgress)
            .where(
                UserDailyProgress.goal_id == deck_goal.id,
                UserDailyProgress.date >= month_start_str,
                UserDailyProgress.date <= month_end_str
            )
        )
        progress_records_map = {p.date: p for p in progress_res.scalars().all()}
    
    # Get study minutes per day
    daily_study_res = await db.execute(
        select(
            func.date(UserAnswer.created_at).label("day"),
            func.sum(UserAnswer.active_time).label("total_time"),
            func.count(UserAnswer.id).label("answer_count")
        )
        .join(Flashcard, UserAnswer.card_id == Flashcard.id)
        .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
        .where(
            Flashcard.deck_id == deck_id,
            DeckAttempt.user_id == user_id,
            UserAnswer.created_at >= month_start,
            UserAnswer.created_at <= month_end
        )
        .group_by(func.date(UserAnswer.created_at))
    )
    daily_data = {}
    for row in daily_study_res.all():
        day_val = row[0]
        if isinstance(day_val, str):
            day_key = day_val
        elif isinstance(day_val, (datetime, date)):
            day_key = day_val.strftime("%Y-%m-%d") if isinstance(day_val, datetime) else day_val.isoformat()
        else:
            continue
        daily_data[day_key] = {
            "study_seconds": float(row[1] or 0),
            "answer_count": int(row[2] or 0)
        }
    
    # Build days array
    days = []
    for d in range(1, days_in_month + 1):
        day_date = date(year, month_num, d)
        day_str = day_date.isoformat()
        info = daily_data.get(day_str, {"study_seconds": 0, "answer_count": 0})
        is_active = info["answer_count"] > 0
        study_minutes = round(info["study_seconds"] / 60.0, 1)
        
        p_record = progress_records_map.get(day_str)
        is_rescued = getattr(p_record, "is_rescued", False) if p_record else False
        is_target_met = getattr(p_record, "is_target_met", False) if p_record else False
        
        completion_percent = 0
        if is_target_met or is_rescued:
            completion_percent = 100
        elif is_active:
            if settings.get("roadmap_active"):
                st = await get_deck_roadmap_status_helper(db, user_id, deck_id, settings, target_date_str=day_str)
                if st.get("all_done"):
                    completion_percent = 100
                else:
                    completion_percent = 50
            else:
                answer_count = info["answer_count"]
                if answer_count >= daily_card_target:
                    completion_percent = 100
                elif study_minutes >= 10:
                    completion_percent = 100
                elif study_minutes >= 5:
                    completion_percent = 75
                else:
                    completion_percent = 50
        
        days.append({
            "date": day_str,
            "day_of_week": day_date.weekday(),  # 0=Monday
            "active": is_active or is_target_met or is_rescued,
            "is_target_met": is_target_met,
            "rescued": is_rescued,
            "completion_percent": completion_percent,
            "study_minutes": study_minutes,
            "answer_count": info["answer_count"]
        })
    
    return {
        "month": month,
        "days": days,
        "total_active_days": sum(1 for d in days if d["active"]),
        "total_study_minutes": round(sum(d["study_minutes"] for d in days), 1)
    }


@router.post("/{deck_id}/roadmap-rescue")
async def rescue_deck_roadmap_day(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Manually use a Streak Freeze card to rescue an uncompleted day."""
    user_id = AuthService.get_user_id(request)
    body = await request.json()
    target_date_str = body.get("date")
    if not target_date_str:
        return JSONResponse(status_code=400, content={"error": "Thiếu ngày cần giải cứu"})
        
    from app.modules.gamification.models import UserGamification
    res_gamify = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = res_gamify.scalar_one_or_none()
    
    freeze_count = user_gamify.streak_freeze_count if (user_gamify and user_gamify.streak_freeze_count) else 0
    if freeze_count <= 0:
        return JSONResponse(status_code=400, content={"error": "Bạn không có đủ Thẻ Cứu Streak. Hãy tích điểm để đổi thẻ trong Cửa Hàng!"})
        
    from app.modules.deck.models import UserDeckGoal
    goal_res = await db.execute(select(UserDeckGoal).where(UserDeckGoal.user_id == user_id, UserDeckGoal.deck_id == deck_id))
    goal = goal_res.scalar_one_or_none()
    if not goal:
        goal = UserDeckGoal(user_id=user_id, deck_id=deck_id, streak_count=0)
        db.add(goal)
        await db.flush()
        
    prog_res = await db.execute(select(UserDailyProgress).where(UserDailyProgress.goal_id == goal.id, UserDailyProgress.date == target_date_str))
    prog = prog_res.scalar_one_or_none()
    
    if not prog:
        prog = UserDailyProgress(goal_id=goal.id, date=target_date_str, is_target_met=True, is_rescued=True)
        db.add(prog)
    else:
        prog.is_target_met = True
        prog.is_rescued = True
        
    user_gamify.streak_freeze_count = max(0, freeze_count - 1)
    user_gamify.last_freeze_used_at = datetime.utcnow()
    
    await db.commit()
    return {
        "success": True, 
        "message": f"🎉 Đã giải cứu thành công ngày {target_date_str}!", 
        "streak_freeze_count": user_gamify.streak_freeze_count
    }


@router.get("/{deck_id}/roadmap-pipeline-history")
async def get_pipeline_history(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    """Get pipeline change history for a deck."""
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import RoadmapPipelineHistory
    
    history_res = await db.execute(
        select(RoadmapPipelineHistory).where(
            RoadmapPipelineHistory.user_id == user_id,
            RoadmapPipelineHistory.deck_id == deck_id
        ).order_by(RoadmapPipelineHistory.changed_at.desc())
    )
    history_items = history_res.scalars().all()
    
    result = []
    for item in history_items:
        result.append({
            "id": item.id,
            "pipeline_json": item.pipeline_json,
            "changed_at": item.changed_at.isoformat() if item.changed_at else None,
            "change_type": item.change_type,
            "change_summary": item.change_summary,
            "effective_from": item.effective_from.isoformat() if item.effective_from else None,
            "effective_until": item.effective_until.isoformat() if item.effective_until else None
        })
    
    return {"history": result}


@router.post("/{deck_id}/reset-progress")
async def reset_deck_progress(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    deck = await DeckService.get_deck_by_id(db, deck_id)
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})
        
    from app.modules.deck.models import Flashcard, UserCardMastery, UserPracticeStats, DeckSession, DeckAttempt, UserAnswer
    from sqlalchemy import delete
    
    # 1. Get all card_ids for this deck
    card_ids_res = await db.execute(select(Flashcard.id).where(Flashcard.deck_id == deck_id))
    card_ids = list(card_ids_res.scalars().all())
    
    if card_ids:
        # 2. Delete UserCardMastery for this user & cards in deck
        await db.execute(
            delete(UserCardMastery).where(
                UserCardMastery.user_id == user_id,
                UserCardMastery.card_id.in_(card_ids)
            )
        )
        
        # 3. Delete UserPracticeStats for this user & cards in deck
        await db.execute(
            delete(UserPracticeStats).where(
                UserPracticeStats.user_id == user_id,
                UserPracticeStats.card_id.in_(card_ids)
            )
        )
        
        # 4. Delete DeckAttempt and UserAnswer for this user & deck
        attempt_ids_res = await db.execute(
            select(DeckAttempt.id).where(
                DeckAttempt.user_id == user_id,
                DeckAttempt.deck_id == deck_id
            )
        )
        attempt_ids = list(attempt_ids_res.scalars().all())
        if attempt_ids:
            await db.execute(delete(UserAnswer).where(UserAnswer.attempt_id.in_(attempt_ids)))
            await db.execute(delete(DeckAttempt).where(DeckAttempt.id.in_(attempt_ids)))
            
    await db.commit()
    return {"status": "ok", "message": "Deck progress reset successfully"}


@router.get("/{deck_id}/roadmap-test-questions")
async def get_roadmap_test_questions(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    
    from app.modules.deck.models import Flashcard, FlashcardDeck, UserDeckSettings, UserCardMastery, UserAnswer, DeckAttempt, DeckSession
    import random
    import json

    # Load deck
    deck_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
    deck = deck_res.scalar_one_or_none()
    if not deck:
        return JSONResponse(status_code=404, content={"error": "Deck not found"})

    deck_title = deck.title
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Check for existing active Roadmap Test Session for today
    sess_res = await db.execute(
        select(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    existing_sess = sess_res.scalar_one_or_none()
    if existing_sess and existing_sess.state_json:
        try:
            state = json.loads(existing_sess.state_json)
            if state.get("created_date") == today_str and state.get("questions"):
                # Load settings for display
                user_sett_res = await db.execute(
                    select(UserDeckSettings).where(
                        UserDeckSettings.user_id == user_id,
                        UserDeckSettings.deck_id == deck_id
                    )
                )
                user_sett = user_sett_res.scalar_one_or_none()
                settings = user_sett.settings if (user_sett and user_sett.settings) else {}
                migrated = migrate_practice_settings(settings)
                creator_migrated = {}
                if deck.practice_settings and isinstance(deck.practice_settings, dict):
                    creator_migrated = migrate_practice_settings(deck.practice_settings)

                return {
                    "title": deck_title,
                    "deck_title": deck_title,
                    "questions": state["questions"],
                    "total": len(state["questions"]),
                    "current_index": existing_sess.current_index,
                    "saved_answers": state.get("saved_answers", {}),
                    "practiceTotalAnswered": state.get("practiceTotalAnswered", 0),
                    "practiceCorrectCount": state.get("practiceCorrectCount", 0),
                    "sessionXP": state.get("sessionXP", 0),
                    "streak": state.get("streak", 0),
                    "practice_settings": migrated,
                    "creator_settings": creator_migrated
                }
        except Exception as e:
            pass

    # Gate check: Step 1 (Học từ mới) MUST be completed today before entering Stage 2 Test
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    status_info = await get_deck_roadmap_status_helper(db, user_id, deck_id, settings)
    
    if not status_info.get("stage_1_done"):
        return JSONResponse(
            status_code=400,
            content={
                "error": "stage_1_not_done",
                "message": "Bạn chưa hoàn thành chỉ tiêu học từ mới hôm nay (Bước 1)! Hãy hoàn thành Bước 1 trước khi làm Bài kiểm tra Roadmap."
            }
        )

    # Load all cards for deck cleanly via async query
    all_cards_res = await db.execute(
        select(Flashcard).where(Flashcard.deck_id == deck_id)
    )
    all_cards = list(all_cards_res.scalars().all())
    if not all_cards:
        return JSONResponse(status_code=404, content={"error": "No cards in deck"})

    # Detect whether current test step is MCQ or Typing
    pipeline_steps = status_info.get("pipeline", [])
    current_step_idx = status_info.get("current_step_index", 0)

    target_test_mode = "mcq"
    if pipeline_steps and current_step_idx < len(pipeline_steps):
        curr_step = pipeline_steps[current_step_idx]
        step_type = curr_step.get("type")
        if step_type in ("mcq", "typing"):
            target_test_mode = step_type
    else:
        test_step = next((st for st in pipeline_steps if st.get("type") in ("mcq", "typing")), None)
        if test_step:
            target_test_mode = test_step.get("type", "mcq")

    # Priority 1 for Roadmap Test: DECK CREATOR PRACTICE SETTINGS (cấu hình gốc của bộ thẻ)
    active_pairs = []
    creator_migrated = {}
    if deck.practice_settings and isinstance(deck.practice_settings, dict):
        creator_migrated = migrate_practice_settings(deck.practice_settings)
        active_pairs = creator_migrated.get(target_test_mode, {}).get("active_pairs", [])
        if not active_pairs and target_test_mode != "mcq":
            active_pairs = creator_migrated.get("mcq", {}).get("active_pairs", [])
        if not active_pairs:
            active_pairs = deck.practice_settings.get("active_pairs", [])

    # Priority 2: User custom settings if creator settings are empty
    user_sett_res = await db.execute(
        select(UserDeckSettings).where(
            UserDeckSettings.user_id == user_id,
            UserDeckSettings.deck_id == deck_id
        )
    )
    user_sett = user_sett_res.scalar_one_or_none()
    settings = user_sett.settings if (user_sett and user_sett.settings) else {}
    migrated = migrate_practice_settings(settings)
    
    if not active_pairs:
        mode_setts = migrated.get(target_test_mode, {})
        active_pairs = mode_setts.get("active_pairs", [])
        if not active_pairs and target_test_mode != "mcq":
            active_pairs = migrated.get("mcq", {}).get("active_pairs", [])

    if not active_pairs:
        active_pairs = [{"q": "front", "a": "back"}]

    def extract_card_val(card, key):
        if not key:
            return (card.content or "").strip()
        # 1. Check card.others dict FIRST for custom column keys (e.g. kanji, meaning, hiragana, etc.)
        if card.others and isinstance(card.others, dict) and key in card.others:
            val = card.others.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
        if key in ("front", "content"):
            return (card.content or "").strip()
        if key in ("back", "explanation"):
            return (card.explanation or "").strip()
        if hasattr(card, key):
            val = getattr(card, key)
            if val is not None and str(val).strip():
                return str(val).strip()
        return (card.explanation or card.content or "").strip()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_utc = datetime.utcnow() - timedelta(days=1)
    
    # 1. Cards overdue by > 1 day (quá hạn 1 ngày chưa ôn)
    overdue_res = await db.execute(
        select(Flashcard)
        .join(UserCardMastery, Flashcard.id == UserCardMastery.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            UserCardMastery.user_id == user_id,
            UserCardMastery.due <= yesterday_utc
        )
    )
    overdue_cards = list(overdue_res.scalars().all())

    # 2. Cards learned today
    min_answer_sub = select(
        UserAnswer.card_id,
        func.min(UserAnswer.created_at).label("min_created")
    ).join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
     .where(
         DeckAttempt.user_id == user_id,
         DeckAttempt.mode.in_(["sequential", "roadmap", "play", "fsrs", "new", "review"])
     )\
     .group_by(UserAnswer.card_id).subquery()

    today_cards_res = await db.execute(
        select(Flashcard)
        .join(min_answer_sub, Flashcard.id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created >= today_start
        )
    )
    today_cards = list(today_cards_res.scalars().all())
    
    # 3. Previously learned cards
    prev_cards_res = await db.execute(
        select(Flashcard)
        .join(min_answer_sub, Flashcard.id == min_answer_sub.c.card_id)
        .where(
            Flashcard.deck_id == deck_id,
            min_answer_sub.c.min_created < today_start
        )
    )
    prev_cards = list(prev_cards_res.scalars().all())
    target_count_from_pipeline = 15
    
    if pipeline_steps and current_step_idx < len(pipeline_steps):
        curr_step = pipeline_steps[current_step_idx]
        if curr_step.get("question_count"):
            try:
                target_count_from_pipeline = int(curr_step["question_count"])
            except (ValueError, TypeError):
                pass
    elif settings.get("roadmap_test_question_count"):
        try:
            target_count_from_pipeline = int(settings["roadmap_test_question_count"])
        except (ValueError, TypeError):
            pass

    max_target_count = max(1, min(target_count_from_pipeline, len(all_cards)))
    selected_cards = []
    selected_ids = set()

    for c in overdue_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    for c in today_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    for c in prev_cards:
        if c.id not in selected_ids and len(selected_cards) < max_target_count:
            selected_cards.append(c)
            selected_ids.add(c.id)

    # Removed padding with unlearned cards. Only test on cards that the user has learned/seen.

    random.shuffle(selected_cards)

    formatted_questions = []
    for idx, card in enumerate(selected_cards, start=1):
        pair = random.choice(active_pairs)
        q_key = pair.get("q", "front")
        a_key = pair.get("a", "back")

        front_text = extract_card_val(card, q_key)
        back_text = extract_card_val(card, a_key)

        # Build candidate distractor cards from all_cards
        other_cards = [c for c in all_cards if c.id != card.id]
        random.shuffle(other_cards)

        seen_a_vals = {back_text.lower()}
        selected_distractor_cards = []

        for oc in other_cards:
            a_val = extract_card_val(oc, a_key)
            if a_val and a_val.lower() not in seen_a_vals:
                seen_a_vals.add(a_val.lower())
                selected_distractor_cards.append(oc)
                if len(selected_distractor_cards) >= 3:
                    break

        # Assemble 4 choice option card objects (1 correct card + up to 3 distractor cards)
        choice_cards = [card] + selected_distractor_cards
        random.shuffle(choice_cards)

        options_list = []
        choice_item_ids = []
        choices_data = []

        for i, c_item in enumerate(choice_cards):
            q_val = extract_card_val(c_item, q_key)
            a_val = extract_card_val(c_item, a_key)
            c_front = (c_item.content or "").strip()
            c_back = (c_item.explanation or "").strip()
            is_correct = (c_item.id == card.id)

            options_list.append({
                "id": i + 1,
                "content": a_val,
                "is_correct": is_correct,
                "card_id": c_item.id
            })
            choice_item_ids.append(c_item.id)
            choices_data.append({
                "id": c_item.id,
                "text": a_val,
                "q_text": q_val,
                "front": c_front,
                "back": c_back,
                "card": {
                    "id": c_item.id,
                    "content": c_item.content,
                    "explanation": c_item.explanation,
                    "others": fix_static_urls(c_item.others),
                    "front_audio_url": fix_static_urls(c_item.front_audio_url),
                    "back_audio_url": fix_static_urls(c_item.back_audio_url),
                    "front_img": fix_static_urls(c_item.front_img),
                    "back_img": fix_static_urls(c_item.back_img)
                }
            })

        formatted_questions.append({
            "id": card.id,
            "orig_index": idx,
            "content": card.content,
            "explanation": card.explanation,
            "options": options_list,
            "front_audio_url": fix_static_urls(card.front_audio_url),
            "back_audio_url": fix_static_urls(card.back_audio_url),
            "others": fix_static_urls(card.others),
            "image": fix_static_urls(card.back_img),
            "audio": fix_static_urls(card.front_audio_url),
            "question_type": target_test_mode,
            "practice_submode": target_test_mode,
            "practice": {
                "question": front_text,
                "choices": [o["content"] for o in options_list],
                "choice_item_ids": choice_item_ids,
                "choices_data": choices_data,
                "correct_index": next((i for i, o in enumerate(options_list) if o["is_correct"]), 0),
                "correct_answer": back_text,
                "question_key": q_key,
                "answer_key": a_key
            }
        })



    # Persist newly generated test session for today
    new_state = {
        "created_date": today_str,
        "questions": formatted_questions,
        "saved_answers": {},
        "practiceTotalAnswered": 0,
        "practiceCorrectCount": 0,
        "sessionXP": 0,
        "streak": 0
    }
    if existing_sess:
        existing_sess.current_index = 0
        existing_sess.state_json = json.dumps(new_state)
        existing_sess.updated_at = datetime.utcnow()
    else:
        new_sess = DeckSession(
            user_id=user_id,
            deck_id=deck_id,
            mode="roadmap_test",
            current_index=0,
            state_json=json.dumps(new_state)
        )
        db.add(new_sess)
    await db.commit()

    return {
        "title": deck_title,
        "deck_title": deck_title,
        "questions": formatted_questions,
        "total": len(formatted_questions),
        "current_index": 0,
        "saved_answers": {},
        "practiceTotalAnswered": 0,
        "practiceCorrectCount": 0,
        "sessionXP": 0,
        "streak": 0,
        "practice_settings": migrated,
        "creator_settings": creator_migrated
    }


@router.post("/{deck_id}/roadmap-test-submit")
async def submit_roadmap_test(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckAttempt, UserAnswer, DeckSession, UserDeckSettings
    from sqlalchemy import delete
    from datetime import datetime
    
    answers = data.get("answers", [])
    total_questions = len(answers)
    correct_count = sum(1 for a in answers if a.get("is_correct"))
    score_percentage = (correct_count / total_questions * 100.0) if total_questions > 0 else 0.0

    pass_threshold = 80
    try:
        user_sett_res = await db.execute(
            select(UserDeckSettings.settings).where(
                UserDeckSettings.user_id == user_id,
                UserDeckSettings.deck_id == deck_id
            )
        )
        user_sett = user_sett_res.scalar_one_or_none() or {}
        raw_pipeline = user_sett.get("pipeline", [])
        if isinstance(raw_pipeline, list):
            for st in raw_pipeline:
                if isinstance(st, dict) and st.get("type") in ("mcq", "typing"):
                    pass_threshold = int(st.get("pass_threshold", 80))
                    break
        elif user_sett.get("roadmap_pass_threshold"):
            pass_threshold = int(user_sett.get("roadmap_pass_threshold", 80))
    except Exception:
        pass_threshold = 80

    passed = score_percentage >= float(pass_threshold)

    # Determine attempt mode: roadmap_typing or roadmap_mcq
    test_mode = data.get("mode") or data.get("test_mode")
    if not test_mode:
        if isinstance(raw_pipeline, list):
            for st in raw_pipeline:
                if isinstance(st, dict) and st.get("type") in ("mcq", "typing"):
                    test_mode = st.get("type")
                    break
    if test_mode in ("roadmap_typing", "typing"):
        attempt_mode = "roadmap_typing"
    else:
        attempt_mode = "roadmap_mcq"

    now_utc = datetime.utcnow()
    # 1. Record DeckAttempt
    attempt = DeckAttempt(
        user_id=user_id,
        deck_id=deck_id,
        mode=attempt_mode,
        total_cards=total_questions,
        score=int(round(score_percentage)),
        started_at=now_utc,
        completed_at=now_utc
    )
    db.add(attempt)
    await db.flush()

    # 2. Record UserAnswers
    for ans in answers:
        card_id = ans.get("card_id")
        if card_id:
            user_ans = UserAnswer(
                attempt_id=attempt.id,
                card_id=card_id,
                is_correct=ans.get("is_correct", False),
                active_time=ans.get("active_time", 2.0)
            )
            db.add(user_ans)

    # 3. Clean up the finished roadmap_test session
    await db.execute(
        delete(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )

    await db.commit()

    return {
        "status": "ok",
        "passed": passed,
        "pass_threshold": pass_threshold,
        "score": round(score_percentage, 1),
        "correct_count": correct_count,
        "total_questions": total_questions,
        "message": "Bài kiểm tra hoàn thành xuất sắc!" if passed else f"Bạn chưa đạt điểm đỗ ({pass_threshold}%), hãy luyện tập thêm nhé!"
    }


@router.post("/{deck_id}/roadmap-test-reset")
async def reset_roadmap_test(request: Request, deck_id: int, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckSession
    from sqlalchemy import delete
    
    await db.execute(
        delete(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    await db.commit()
    return {"status": "ok"}


@router.post("/{deck_id}/roadmap-test-save-progress")
async def save_roadmap_test_progress(request: Request, deck_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = AuthService.get_user_id(request)
    from app.modules.deck.models import DeckSession
    import json
    
    sess_res = await db.execute(
        select(DeckSession).where(
            DeckSession.user_id == user_id,
            DeckSession.deck_id == deck_id,
            DeckSession.mode == "roadmap_test"
        )
    )
    sess = sess_res.scalar_one_or_none()
    if sess and sess.state_json:
        try:
            state = json.loads(sess.state_json)
            if "practiceAnswers" in data:
                state["saved_answers"] = data.get("practiceAnswers")
            if "practiceTotalAnswered" in data:
                state["practiceTotalAnswered"] = data.get("practiceTotalAnswered")
            if "practiceCorrectCount" in data:
                state["practiceCorrectCount"] = data.get("practiceCorrectCount")
            if "sessionXP" in data:
                state["sessionXP"] = data.get("sessionXP")
            if "streak" in data:
                state["streak"] = data.get("streak")
            
            sess.current_index = data.get("current_index", sess.current_index)
            sess.state_json = json.dumps(state)
            sess.updated_at = datetime.utcnow()
            await db.commit()
        except Exception:
            pass
    return {"status": "ok"}
