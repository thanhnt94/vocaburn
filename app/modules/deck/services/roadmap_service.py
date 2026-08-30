import logging
import math
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete, case
from sqlalchemy.orm import selectinload

from app.modules.deck.models import (
    FlashcardDeck, Flashcard, UserCardMastery, UserAnswer,
    DeckAttempt, UserDeckGoal, UserDailyProgress, DeckSession,
    UserDeckSettings, RoadmapPipelineHistory, UserPracticeStats
)
from app.modules.deck.utils import fix_static_urls, migrate_practice_settings

logger = logging.getLogger(__name__)


class RoadmapService:

    @staticmethod
    async def get_deck_streak_for_user(db: AsyncSession, user_id: int, deck_id: int) -> int:
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
                except Exception as e:
                    logger.warning(f"Error parsing active date string '{val}': {e}")
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

    @staticmethod
    async def get_deck_roadmap_status(
        db: AsyncSession,
        user_id: int,
        deck_id: int,
        settings: dict,
        target_date_str: Optional[str] = None
    ) -> dict:
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
            except Exception as e:
                logger.warning(f"Failed to parse target_date_str '{target_date_str}': {e}")
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

        cutoff_time = day_end - timedelta(hours=fsrs_overdue_hours)

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
        review_due_today = review_still_due + review_completed_today

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
                available_new_today = unlearned_cards + new_learned_today
                effective_target = min(daily_count, available_new_today)
                is_all_learned = (unlearned_cards == 0)
                is_done = (
                    (new_learned_today >= daily_count) or
                    is_all_learned or
                    (available_new_today > 0 and new_learned_today >= available_new_today)
                )
                step_data.update({
                    "daily_count": daily_count,
                    "effective_target": effective_target,
                    "all_learned": is_all_learned,
                    "done": is_done,
                    "progress": {
                        "learned": new_learned_today,
                        "target": effective_target,
                        "unlearned_cards": unlearned_cards,
                        "all_learned": is_all_learned
                    },
                    "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                    "label": "All new cards learned" if is_all_learned else "Learn New Words"
                })
            elif stype == "fsrs_review":
                overdue_hours = int(st.get("overdue_hours", 24))
                is_done = (review_still_due <= 0) or (review_due_today <= 0) or (review_completed_today >= review_due_today)
                step_data.update({
                    "overdue_hours": overdue_hours,
                    "done": is_done,
                    "progress": {
                        "due_count": review_due_today,
                        "still_due": review_still_due,
                        "reviewed_today": review_completed_today
                    },
                    "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                    "label": "FSRS Review"
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
                    "label": "MCQ Quiz"
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
                    "label": "Typing Test"
                })
            elif stype == "study_time":
                target_mins = int(st.get("target_minutes", 10))
                is_done = today_studied_minutes >= target_mins
                step_data.update({
                    "target_minutes": target_mins,
                    "done": is_done,
                    "progress": {"studied_minutes": today_studied_minutes, "target_minutes": target_mins},
                    "url": f"/flashcard/{deck_id}/play?mode=roadmap",
                    "label": f"Study Time ({target_mins}m)"
                })

            if prog and getattr(prog, 'is_rescued', False):
                step_data["done"] = True

            pipeline_processed.append(step_data)
            if not step_data["done"] and first_incomplete_idx is None:
                first_incomplete_idx = idx

            if unlearned_cards > 0 and daily_new_target > 0:
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
            except Exception as e:
                logger.warning(f"Error parsing met_date string '{d_str}': {e}")

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
            next_action_label = "All cards mastered!" if all_cards_learned else "Today's roadmap completed"
        elif len(pipeline_processed) > 0:
            current_step_index = first_incomplete_idx
            next_action_url = pipeline_processed[first_incomplete_idx]["url"]
            next_action_label = pipeline_processed[first_incomplete_idx]["label"]
        else:
            all_done = False
            current_step_index = 0
            next_action_url = f"/flashcard/{deck_id}/roadmap"
            next_action_label = "Roadmap not configured"

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
            "days_left": days_left if 'days_left' in locals() else 0,
            "estimated_completion_date": estimated_completion_date if 'estimated_completion_date' in locals() else None,
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
