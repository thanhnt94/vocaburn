from sqlalchemy import select, func, desc, extract, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.deck.models import UserAnswer, FlashcardDeck, Flashcard, Category, DeckAttempt
from app.modules.auth.models import User
from app.modules.stats.models import UserDailyStats
from app.modules.gamification.models import UserGamification, XPTransaction
from datetime import datetime, timedelta

class AnalyticsService:
    @staticmethod
    async def get_global_stats(db: AsyncSession):
        # 1. Platform Totals in a single consolidated subquery statement
        totals_stmt = select(
            select(func.count(Flashcard.id)).scalar_subquery().label("total_cards"),
            select(func.count(FlashcardDeck.id)).scalar_subquery().label("total_decks"),
            select(func.count(User.id)).scalar_subquery().label("total_users")
        )
        
        # 2. Platform Performance
        perf_stmt = select(
            func.count(UserAnswer.id).label("total"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time")
        )
        
        # Execute both consolidated queries
        totals_res = (await db.execute(totals_stmt)).one_or_none()
        perf_res = (await db.execute(perf_stmt)).one_or_none()
        
        total_cards = totals_res.total_cards if totals_res else 0
        total_decks = totals_res.total_decks if totals_res else 0
        total_users = totals_res.total_users if totals_res else 0
        
        platform_accuracy = 0
        avg_time = 0
        if perf_res and perf_res.total > 0:
            platform_accuracy = round((perf_res.correct / perf_res.total) * 100, 1)
            avg_time = round(perf_res.avg_time or 0, 1)
            
        return {
            "total_questions": total_cards,
            "total_cards": total_cards, # compatibility
            "total_quizzes": total_decks,
            "total_decks": total_decks, # compatibility
            "total_users": total_users,
            "platform_accuracy": platform_accuracy,
            "avg_time_per_question": avg_time,
            "avg_time_per_card": avg_time # compatibility
        }

    @staticmethod
    def get_timezone_boundaries(time_filter: str, tz_offset: int = -420):
        """
        Returns (utc_start_datetime, local_start_date) based on user's timezone offset in minutes.
        - tz_offset = -420 for UTC+7 (Vietnam).
        """
        from datetime import datetime, timedelta
        now_utc = datetime.utcnow()
        now_local = now_utc - timedelta(minutes=tz_offset)
        today_local_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if time_filter == "today":
            local_start = today_local_start
        elif time_filter == "week":
            local_start = today_local_start - timedelta(days=today_local_start.weekday())
        elif time_filter == "month":
            local_start = today_local_start.replace(day=1)
        else:
            return None, None
            
        utc_start = local_start + timedelta(minutes=tz_offset)
        return utc_start, local_start.date()

    @staticmethod
    async def get_user_detailed_stats(db: AsyncSession, user_id: int, time_filter: str = "all_time", tz_offset: int = -420):
        user_stats = await AnalyticsService._get_user_stats_internal(db, user_id, time_filter, tz_offset)
        global_stats = await AnalyticsService.get_global_stats(db)
        
        return {
            "personal": user_stats,
            "global": global_stats
        }

    @staticmethod
    async def _get_user_stats_internal(db: AsyncSession, user_id: int, time_filter: str = "all_time", tz_offset: int = -420):
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=29)
        
        daily_stmt = select(
            UserDailyStats.date,
            UserDailyStats.questions_attempted,
            UserDailyStats.correct_answers,
            UserDailyStats.accuracy,
            UserDailyStats.total_time_seconds
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_date
        ).order_by(UserDailyStats.date)
        
        daily_results = await db.execute(daily_stmt)
        daily_data = []
        for row in daily_results.all():
            day_val = row[0]
            if isinstance(day_val, str):
                date_str = day_val[:10]
            elif day_val:
                date_str = day_val.strftime("%Y-%m-%d")
            else:
                date_str = ""
                
            daily_data.append({
                "date": date_str,
                "attempted": row[1] or 0,
                "correct": row[2] or 0,
                "accuracy": round((row[3] or 0) * 100, 1),
                "time_minutes": round((row[4] or 0) / 60, 1)
            })

        # 2. Category Performance
        cat_stmt = select(
            Category.name,
            func.count(UserAnswer.id).label("total"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time")
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .join(Flashcard, UserAnswer.card_id == Flashcard.id)\
         .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)\
         .join(Category, FlashcardDeck.category_id == Category.id)\
         .where(DeckAttempt.user_id == user_id)\
         .group_by(Category.name)

        cat_results = await db.execute(cat_stmt)
        category_stats = []
        for row in cat_results.all():
            category_stats.append({
                "category": row[0],
                "total": row[1] or 0,
                "correct": row[2] or 0,
                "accuracy": round((row[2] / row[1]) * 100, 1) if row[1] and row[1] > 0 else 0,
                "avg_time": round(row[3] or 0, 1)
            })

        # 3. Overall Summary
        summary_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.correct_answers).label("total_correct"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(UserDailyStats.user_id == user_id)
        
        if time_filter != "all_time":
            _, local_start_date = AnalyticsService.get_timezone_boundaries(time_filter, tz_offset)
            if local_start_date:
                local_start_datetime = datetime.combine(local_start_date, datetime.min.time())
                summary_stmt = summary_stmt.where(UserDailyStats.date >= local_start_datetime)
        
        summary_res = (await db.execute(summary_stmt)).one_or_none()
        
        total_q = 0
        total_correct = 0
        total_time = 0
        
        if summary_res:
            total_q = summary_res[0] or 0
            total_correct = summary_res[1] or 0
            total_time = summary_res[2] or 0
        
        summary = {
            "total_questions": total_q,
            "total_cards": total_q, # compatibility
            "total_correct": total_correct,
            "total_time_hours": round(total_time / 3600, 1),
            "global_accuracy": round((total_correct / total_q * 100), 1) if total_q > 0 else 0
        }

        # 4. Hourly Distribution (Study Hours)
        active_days_stmt = select(
            func.count(func.distinct(func.date(UserAnswer.created_at)))
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == user_id)
        
        active_days_res = await db.execute(active_days_stmt)
        active_days_count = active_days_res.scalar() or 1

        # 5. Hourly Distribution (Study Hours)
        hour_stmt = select(
            extract('hour', UserAnswer.created_at).label("hour"),
            func.count(UserAnswer.id).label("count")
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == user_id)\
         .group_by("hour")
          
         # Note: group_by hour returns standard extract hour
        hour_results = await db.execute(hour_stmt)
        hourly_data = {i: 0 for i in range(24)}
        for row in hour_results.all():
            h = int(row[0]) if row[0] is not None else 0
            hourly_data[h] = row[1]
        
        hourly_formatted = [
            {
                "hour": f"{h:02d}:00",
                "count": count,
                "average": round(count / active_days_count, 2)
            }
            for h, count in hourly_data.items()
        ]

        # 5. Recent Sessions
        recent_stmt = select(
            FlashcardDeck.title,
            DeckAttempt.score,
            DeckAttempt.total_cards,
            DeckAttempt.completed_at
        ).join(FlashcardDeck, DeckAttempt.deck_id == FlashcardDeck.id)\
         .where(DeckAttempt.user_id == user_id, DeckAttempt.completed_at != None)\
         .order_by(desc(DeckAttempt.completed_at))\
         .limit(5)
        
        recent_results = await db.execute(recent_stmt)
        recent_sessions = []
        for row in recent_results.all():
            recent_sessions.append({
                "title": row[0],
                "score": row[1],
                "total": row[2],
                "date": row[3].strftime("%Y-%m-%d %H:%M") if row[3] else ""
            })

        return {
            "daily_activity": daily_data,
            "category_performance": category_stats,
            "hourly_distribution": hourly_formatted,
            "recent_sessions": recent_sessions,
            "summary": summary
        }

    @staticmethod
    async def get_leaderboard(db: AsyncSession, current_user_id: int, time_filter: str = "all_time", tz_offset: int = -420):
        # Calculate date boundaries in UTC and user local timezone
        start_datetime, local_start_date = AnalyticsService.get_timezone_boundaries(time_filter, tz_offset)
        local_start_datetime = datetime.combine(local_start_date, datetime.min.time()) if local_start_date else None

        # 1. Fetch current user's baseline data
        curr_game_res = await db.execute(
            select(UserGamification).where(UserGamification.user_id == current_user_id)
        )
        curr_game = curr_game_res.scalar_one_or_none()
        curr_streak = curr_game.streak_count if curr_game else 0

        # Current user's XP logic based on time filter
        if time_filter == "all_time":
            curr_xp = curr_game.xp if curr_game else 0
        else:
            curr_xp_res = await db.execute(
                select(func.sum(XPTransaction.amount)).where(
                    XPTransaction.user_id == current_user_id,
                    XPTransaction.created_at >= start_datetime
                )
            )
            curr_xp = curr_xp_res.scalar() or 0

        # Current user's daily stats aggregates
        curr_stats_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.correct_answers).label("total_c"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(UserDailyStats.user_id == current_user_id)
        if local_start_datetime:
            curr_stats_stmt = curr_stats_stmt.where(UserDailyStats.date >= local_start_datetime)
        
        curr_stats_res = await db.execute(curr_stats_stmt)
        curr_stats = curr_stats_res.one_or_none()
        curr_total_q = (curr_stats.total_q if curr_stats else 0) or 0
        curr_total_c = (curr_stats.total_c if curr_stats else 0) or 0
        curr_total_time = (curr_stats.total_time if curr_stats else 0) or 0
        curr_acc = (curr_total_c * 100.0 / curr_total_q) if curr_total_q > 0 else 0.0

        # Touch current user presence
        from app.core.presence import PresenceTracker
        PresenceTracker.touch(current_user_id)

        # Helper to format rows with active presence status
        async def execute_and_format_leaderboard(stmt):
            res = await db.execute(stmt)
            out = []
            for rank_idx, row in enumerate(res.all(), 1):
                u_id = row[0]
                db_last_act = row[5] if len(row) > 5 else None
                status, status_text = PresenceTracker.get_status_info(u_id, db_last_act)
                out.append({
                    "rank": rank_idx,
                    "user_id": u_id,
                    "username": row[1],
                    "full_name": row[2] or row[1],
                    "value": row[3] or 0,
                    "level": row[4] or 1,
                    "active_status": status,
                    "active_text": status_text
                })
            return out

        # --- XP LEADERBOARD ---
        if time_filter == "all_time":
            xp_stmt = select(
                User.id, User.username, User.full_name,
                UserGamification.xp.label("value"), UserGamification.level,
                func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
            ).select_from(User).join(UserGamification, User.id == UserGamification.user_id)\
             .order_by(desc(UserGamification.xp)).limit(50)
            xp_list = await execute_and_format_leaderboard(xp_stmt)

            xp_rank_res = await db.execute(
                select(func.count(User.id)).select_from(User)
                .join(UserGamification, User.id == UserGamification.user_id)
                .where(UserGamification.xp > curr_xp)
            )
            xp_rank = xp_rank_res.scalar() + 1
        else:
            xp_stmt = select(
                User.id, User.username, User.full_name,
                func.sum(XPTransaction.amount).label("value"), UserGamification.level,
                func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
            ).select_from(XPTransaction)\
             .join(User, User.id == XPTransaction.user_id)\
             .outerjoin(UserGamification, UserGamification.user_id == XPTransaction.user_id)\
             .where(XPTransaction.created_at >= start_datetime)\
             .group_by(User.id, User.username, User.full_name, UserGamification.level, func.coalesce(UserGamification.last_activity, User.created_at))\
             .order_by(desc("value")).limit(50)
            xp_list = await execute_and_format_leaderboard(xp_stmt)

            ahead_sub = select(
                XPTransaction.user_id
            ).where(
                XPTransaction.created_at >= start_datetime
            ).group_by(XPTransaction.user_id).having(func.sum(XPTransaction.amount) > curr_xp).subquery()
            xp_rank_res = await db.execute(select(func.count()).select_from(ahead_sub))
            xp_rank = xp_rank_res.scalar() + 1

        # --- STREAK LEADERBOARD ---
        streak_stmt = select(
            User.id, User.username, User.full_name,
            UserGamification.streak_count.label("value"), UserGamification.level,
            func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
        ).select_from(User).join(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(UserGamification.streak_count)).limit(50)
        streak_list = await execute_and_format_leaderboard(streak_stmt)

        streak_rank_res = await db.execute(
            select(func.count(User.id)).select_from(User)
            .join(UserGamification, User.id == UserGamification.user_id)
            .where(UserGamification.streak_count > curr_streak)
        )
        streak_rank = streak_rank_res.scalar() + 1

        # --- QUESTIONS LEADERBOARD ---
        if local_start_datetime:
            q_subq = select(
                UserDailyStats.user_id,
                func.sum(UserDailyStats.questions_attempted).label("total_q")
            ).where(UserDailyStats.date >= local_start_datetime).group_by(UserDailyStats.user_id).subquery()
        else:
            q_subq = select(
                UserDailyStats.user_id,
                func.sum(UserDailyStats.questions_attempted).label("total_q")
            ).group_by(UserDailyStats.user_id).subquery()

        q_stmt = select(
            User.id, User.username, User.full_name,
            q_subq.c.total_q.label("value"), UserGamification.level,
            func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
        ).select_from(User).join(q_subq, User.id == q_subq.c.user_id)\
         .outerjoin(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(q_subq.c.total_q)).limit(50)
        q_list = await execute_and_format_leaderboard(q_stmt)

        if local_start_datetime:
            q_rank_sub = select(
                UserDailyStats.user_id
            ).where(UserDailyStats.date >= local_start_datetime).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > curr_total_q).subquery()
        else:
            q_rank_sub = select(
                UserDailyStats.user_id
            ).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > curr_total_q).subquery()
        q_rank_res = await db.execute(select(func.count()).select_from(q_rank_sub))
        q_rank = q_rank_res.scalar() + 1

        # --- TIME LEADERBOARD (Study Time in Seconds) ---
        if local_start_datetime:
            time_subq = select(
                UserDailyStats.user_id,
                func.sum(UserDailyStats.total_time_seconds).label("total_time")
            ).where(
                UserDailyStats.date >= local_start_datetime,
                UserDailyStats.total_time_seconds > 0
            ).group_by(UserDailyStats.user_id).subquery()
        else:
            time_subq = select(
                UserDailyStats.user_id,
                func.sum(UserDailyStats.total_time_seconds).label("total_time")
            ).where(
                UserDailyStats.total_time_seconds > 0
            ).group_by(UserDailyStats.user_id).subquery()

        time_stmt = select(
            User.id, User.username, User.full_name,
            time_subq.c.total_time.label("value"), UserGamification.level,
            func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
        ).select_from(User).join(time_subq, User.id == time_subq.c.user_id)\
         .outerjoin(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(time_subq.c.total_time)).limit(50)
        time_list = await execute_and_format_leaderboard(time_stmt)

        if local_start_datetime:
            time_rank_sub = select(
                UserDailyStats.user_id
            ).where(
                UserDailyStats.date >= local_start_datetime
            ).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > curr_total_time).subquery()
        else:
            time_rank_sub = select(
                UserDailyStats.user_id
            ).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > curr_total_time).subquery()
        time_rank_res = await db.execute(select(func.count()).select_from(time_rank_sub))
        time_rank = time_rank_res.scalar() + 1

        # --- ACCURACY LEADERBOARD (min 20 questions) ---
        if local_start_datetime:
            acc_subq = select(
                UserDailyStats.user_id,
                (func.sum(UserDailyStats.correct_answers) * 100.0 / func.sum(UserDailyStats.questions_attempted)).label("acc")
            ).where(UserDailyStats.date >= local_start_datetime).group_by(UserDailyStats.user_id)\
             .having(func.sum(UserDailyStats.questions_attempted) >= 20)\
             .subquery()
        else:
            acc_subq = select(
                UserDailyStats.user_id,
                (func.sum(UserDailyStats.correct_answers) * 100.0 / func.sum(UserDailyStats.questions_attempted)).label("acc")
            ).group_by(UserDailyStats.user_id)\
             .having(func.sum(UserDailyStats.questions_attempted) >= 20)\
             .subquery()

        acc_stmt = select(
            User.id, User.username, User.full_name,
            acc_subq.c.acc.label("value"), UserGamification.level,
            func.coalesce(UserGamification.last_activity, User.created_at).label("last_activity")
        ).select_from(User).join(acc_subq, User.id == acc_subq.c.user_id)\
         .outerjoin(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(acc_subq.c.acc)).limit(50)
        
        acc_res = await db.execute(acc_stmt)
        acc_list = []
        for rank_idx, row in enumerate(acc_res.all(), 1):
            u_id = row[0]
            db_last_act = row[5] if len(row) > 5 else None
            status, status_text = PresenceTracker.get_status_info(u_id, db_last_act)
            acc_list.append({
                "rank": rank_idx,
                "user_id": u_id,
                "username": row[1],
                "full_name": row[2] or row[1],
                "value": round(row[3] or 0.0, 1),
                "level": row[4] or 1,
                "active_status": status,
                "active_text": status_text
            })

        if curr_total_q >= 20:
            if local_start_datetime:
                acc_rank_sub = select(
                    UserDailyStats.user_id
                ).where(UserDailyStats.date >= local_start_datetime).group_by(UserDailyStats.user_id)\
                 .having(and_(
                     func.sum(UserDailyStats.questions_attempted) >= 20,
                     (func.sum(UserDailyStats.correct_answers) * 100.0 / func.sum(UserDailyStats.questions_attempted)) > curr_acc
                 )).subquery()
            else:
                acc_rank_sub = select(
                    UserDailyStats.user_id
                ).group_by(UserDailyStats.user_id)\
                 .having(and_(
                     func.sum(UserDailyStats.questions_attempted) >= 20,
                     (func.sum(UserDailyStats.correct_answers) * 100.0 / func.sum(UserDailyStats.questions_attempted)) > curr_acc
                 )).subquery()
            acc_rank_res = await db.execute(select(func.count()).select_from(acc_rank_sub))
            acc_rank = acc_rank_res.scalar() + 1
        else:
            acc_rank = -1

        return {
            "xp": {
                "list": xp_list,
                "user_rank": xp_rank,
                "user_value": curr_xp
            },
            "streak": {
                "list": streak_list,
                "user_rank": streak_rank,
                "user_value": curr_streak
            },
            "questions": {
                "list": q_list,
                "user_rank": q_rank,
                "user_value": curr_total_q
            },
            "time": {
                "list": time_list,
                "user_rank": time_rank,
                "user_value": curr_total_time
            },
            "accuracy": {
                "list": acc_list,
                "user_rank": acc_rank,
                "user_value": round(curr_acc, 1)
            }
        }

    @staticmethod
    async def get_daily_comparison_stats(db: AsyncSession, user_id: int):
        import asyncio
        today = datetime.utcnow().date()
        start_date = datetime.combine(today - timedelta(days=13), datetime.min.time())

        # 1. Total and unique reviews per day (last 14 days)
        reviews_stmt = select(
            func.date(UserAnswer.created_at).label("date_str"),
            func.count(UserAnswer.id).label("total_reviews"),
            func.count(func.distinct(UserAnswer.card_id)).label("unique_cards"),
            func.sum(UserAnswer.active_time).label("total_active_time")
        ).join(
            DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
        ).where(
            DeckAttempt.user_id == user_id,
            UserAnswer.created_at >= start_date
        ).group_by(
            func.date(UserAnswer.created_at)
        )

        # 2. Subquery for first ever answers of each card by user
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

        # Cards first answered per day (last 14 days)
        new_cards_stmt = select(
            func.date(first_answers.c.first_answered_at).label("date_str"),
            func.count(first_answers.c.card_id).label("new_cards")
        ).where(
            first_answers.c.first_answered_at >= start_date
        ).group_by(
            func.date(first_answers.c.first_answered_at)
        )

        # 3. All-time daily stats for computing historical averages
        all_time_reviews_stmt = select(
            func.date(UserAnswer.created_at).label("date_str"),
            func.count(UserAnswer.id).label("total_reviews"),
            func.count(func.distinct(UserAnswer.card_id)).label("unique_cards"),
            func.sum(UserAnswer.active_time).label("total_active_time")
        ).join(
            DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id
        ).where(
            DeckAttempt.user_id == user_id
        ).group_by(
            func.date(UserAnswer.created_at)
        )

        all_time_new_cards_stmt = select(
            func.date(first_answers.c.first_answered_at).label("date_str"),
            func.count(first_answers.c.card_id).label("new_cards")
        ).group_by(
            func.date(first_answers.c.first_answered_at)
        )

        reviews_res = await db.execute(reviews_stmt)
        new_cards_res = await db.execute(new_cards_stmt)
        all_reviews_res = await db.execute(all_time_reviews_stmt)
        all_new_res = await db.execute(all_time_new_cards_stmt)

        daily_map = {}
        for i in range(14):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            daily_map[d_str] = {
                "date": d_str,
                "new_cards": 0,
                "unique_cards": 0,
                "total_reviews": 0,
                "study_minutes": 0.0
            }

        def parse_db_date(val) -> str:
            if not val:
                return ""
            if isinstance(val, str):
                return val[:10]
            return val.strftime("%Y-%m-%d")

        for row in reviews_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str in daily_map:
                daily_map[d_str]["total_reviews"] = row.total_reviews or 0
                daily_map[d_str]["unique_cards"] = row.unique_cards or 0
                daily_map[d_str]["study_minutes"] = round((row.total_active_time or 0.0) / 60.0, 1)

        for row in new_cards_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str in daily_map:
                daily_map[d_str]["new_cards"] = row.new_cards or 0

        # Compute all-time averages across active days only
        all_time_by_day: dict = {}
        for row in all_reviews_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str:
                all_time_by_day.setdefault(d_str, {"new_cards": 0, "unique_cards": 0, "total_reviews": 0, "study_minutes": 0.0})
                all_time_by_day[d_str]["total_reviews"] = row.total_reviews or 0
                all_time_by_day[d_str]["unique_cards"] = row.unique_cards or 0
                all_time_by_day[d_str]["study_minutes"] = round((row.total_active_time or 0.0) / 60.0, 1)
        for row in all_new_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str:
                all_time_by_day.setdefault(d_str, {"new_cards": 0, "unique_cards": 0, "total_reviews": 0, "study_minutes": 0.0})
                all_time_by_day[d_str]["new_cards"] = row.new_cards or 0

        active_days = len(all_time_by_day)
        if active_days > 0:
            avg_new = round(sum(v["new_cards"] for v in all_time_by_day.values()) / active_days, 1)
            avg_unique = round(sum(v["unique_cards"] for v in all_time_by_day.values()) / active_days, 1)
            avg_reviews = round(sum(v["total_reviews"] for v in all_time_by_day.values()) / active_days, 1)
            avg_minutes = round(sum(v["study_minutes"] for v in all_time_by_day.values()) / active_days, 1)
        else:
            avg_new = avg_unique = avg_reviews = avg_minutes = 0.0

        return {
            "days": [daily_map[k] for k in sorted(daily_map.keys())],
            "all_time_avg": {
                "new_cards": avg_new,
                "unique_cards": avg_unique,
                "total_reviews": avg_reviews,
                "study_minutes": avg_minutes,
                "active_days": active_days
            }
        }

    @staticmethod
    async def get_daily_summary(db: AsyncSession, user_id: int, tz_offset: int = -420):
        from app.modules.deck.models import UserDeckGoal, UserDailyProgress
        from app.modules.gamification.models import PointTransaction
        from sqlalchemy.orm import joinedload

        now_utc = datetime.utcnow()
        now_local = now_utc - timedelta(minutes=tz_offset)
        today_local_date = now_local.date()
        today_start_utc = datetime.combine(today_local_date, datetime.min.time()) + timedelta(minutes=tz_offset)
        today_end_utc = today_start_utc + timedelta(days=1)

        # 1. Fetch all user answers today with attempt info
        answers_stmt = (
            select(
                UserAnswer.id,
                UserAnswer.card_id,
                UserAnswer.is_correct,
                UserAnswer.active_time,
                UserAnswer.rating,
                UserAnswer.created_at,
                DeckAttempt.deck_id,
                DeckAttempt.mode,
                DeckAttempt.id.label("attempt_id")
            )
            .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
            .where(
                DeckAttempt.user_id == user_id,
                UserAnswer.created_at >= today_start_utc,
                UserAnswer.created_at < today_end_utc
            )
            .order_by(UserAnswer.created_at.asc())
        )
        answers_res = await db.execute(answers_stmt)
        today_answers = answers_res.all()

        total_cards_studied = len(today_answers)
        correct_count = sum(1 for a in today_answers if a.is_correct)
        wrong_count = total_cards_studied - correct_count
        accuracy = round((correct_count / total_cards_studied) * 100, 1) if total_cards_studied > 0 else 0
        active_time_seconds = sum((a.active_time or 0.0) for a in today_answers)
        study_minutes = round(active_time_seconds / 60.0, 1)

        # 2. Distinct new cards learned today (first time answered ever by this user)
        first_answers_sub = (
            select(
                UserAnswer.card_id,
                func.min(UserAnswer.created_at).label("first_answered_at")
            )
            .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)
            .where(DeckAttempt.user_id == user_id)
            .group_by(UserAnswer.card_id)
            .having(func.min(UserAnswer.created_at) >= today_start_utc)
        ).subquery()

        first_answers_res = await db.execute(select(func.count(first_answers_sub.c.card_id)))
        new_cards_learned = first_answers_res.scalar() or 0
        cards_reviewed = max(0, total_cards_studied - new_cards_learned)

        # 3. Hourly Activity Distribution (0 to 23 hours local time)
        hourly_counts = [0] * 24
        for a in today_answers:
            if a.created_at:
                local_dt = a.created_at - timedelta(minutes=tz_offset)
                hour = local_dt.hour
                if 0 <= hour < 24:
                    hourly_counts[hour] += 1

        # 4. Fetch Attempts/Sessions today
        attempts_stmt = (
            select(DeckAttempt)
            .options(joinedload(DeckAttempt.answers))
            .where(
                DeckAttempt.user_id == user_id,
                DeckAttempt.started_at >= today_start_utc,
                DeckAttempt.started_at < today_end_utc
            )
            .order_by(DeckAttempt.started_at.desc())
        )
        attempts_res = await db.execute(attempts_stmt)
        today_attempts = attempts_res.unique().scalars().all()

        deck_ids = list(set(att.deck_id for att in today_attempts if att.deck_id).union(
            set(a.deck_id for a in today_answers if a.deck_id)
        ))
        deck_map = {}
        if deck_ids:
            decks_res = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id.in_(deck_ids)))
            for d in decks_res.scalars().all():
                deck_map[d.id] = d

        sessions_data = []
        for att in today_attempts:
            d = deck_map.get(att.deck_id)
            att_answers = att.answers or []
            att_correct = sum(1 for ans in att_answers if ans.is_correct)
            att_total = len(att_answers) if att_answers else (att.total_cards or 0)
            att_time = sum((ans.active_time or 0.0) for ans in att_answers)
            if att_time <= 0.0 and att.completed_at and att.started_at:
                att_time = max(0.0, (att.completed_at - att.started_at).total_seconds())

            local_start = att.started_at - timedelta(minutes=tz_offset) if att.started_at else None
            local_end = att.completed_at - timedelta(minutes=tz_offset) if att.completed_at else None

            estimated_xp = (att_correct * 3) + (5 if att_total >= 5 and (att_correct / att_total) >= 0.8 else 0)

            sessions_data.append({
                "attempt_id": att.id,
                "deck_id": att.deck_id,
                "deck_title": d.title if d else f"Deck #{att.deck_id}",
                "deck_cover": d.cover_image if d else None,
                "mode": att.mode or "fsrs",
                "score": att.score or 0,
                "total_cards": att_total,
                "correct_count": att_correct,
                "accuracy": round((att_correct / att_total) * 100) if att_total > 0 else 0,
                "duration_seconds": round(att_time),
                "duration_minutes": round(att_time / 60.0, 1),
                "started_at": local_start.strftime("%H:%M") if local_start else "",
                "started_at_full": local_start.isoformat() if local_start else "",
                "completed_at": local_end.strftime("%H:%M") if local_end else "",
                "is_completed": att.completed_at is not None,
                "xp_earned": estimated_xp
            })

        first_study_time = sessions_data[-1]["started_at"] if sessions_data else None
        last_study_time = sessions_data[0]["started_at"] if sessions_data else None

        # 5. Today's XP & Points
        xp_res = await db.execute(
            select(func.sum(XPTransaction.amount))
            .where(XPTransaction.user_id == user_id, XPTransaction.created_at >= today_start_utc, XPTransaction.created_at < today_end_utc)
        )
        today_xp = xp_res.scalar() or 0

        pts_res = await db.execute(
            select(func.sum(PointTransaction.amount))
            .where(PointTransaction.user_id == user_id, PointTransaction.created_at >= today_start_utc, PointTransaction.created_at < today_end_utc)
        )
        today_pts = pts_res.scalar() or 0

        # 6. Gamification
        gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        gamify = gamify_res.scalar_one_or_none()

        # 7. Decks Studied Today Breakdown
        decks_studied_map = {}
        for a in today_answers:
            did = a.deck_id
            if not did:
                continue
            if did not in decks_studied_map:
                d = deck_map.get(did)
                decks_studied_map[did] = {
                    "deck_id": did,
                    "deck_title": d.title if d else f"Deck #{did}",
                    "deck_cover": d.cover_image if d else None,
                    "cards_count": 0,
                    "correct_count": 0,
                    "active_time": 0.0,
                    "modes": set()
                }
            decks_studied_map[did]["cards_count"] += 1
            if a.is_correct:
                decks_studied_map[did]["correct_count"] += 1
            decks_studied_map[did]["active_time"] += (a.active_time or 0.0)
            if a.mode:
                decks_studied_map[did]["modes"].add(a.mode)

        decks_summary = []
        for did, item in decks_studied_map.items():
            total_c = item["cards_count"]
            corr_c = item["correct_count"]
            decks_summary.append({
                "deck_id": item["deck_id"],
                "deck_title": item["deck_title"],
                "deck_cover": item["deck_cover"],
                "cards_count": total_c,
                "correct_count": corr_c,
                "accuracy": round((corr_c / total_c) * 100) if total_c > 0 else 0,
                "study_minutes": round(item["active_time"] / 60.0, 1),
                "modes": list(item["modes"])
            })
        decks_summary.sort(key=lambda x: x["cards_count"], reverse=True)

        # 8. Mode Breakdown
        mode_breakdown = {}
        for a in today_answers:
            m = a.mode or "fsrs"
            if m not in mode_breakdown:
                mode_breakdown[m] = {"mode": m, "cards": 0, "correct": 0, "time_seconds": 0.0}
            mode_breakdown[m]["cards"] += 1
            if a.is_correct:
                mode_breakdown[m]["correct"] += 1
            mode_breakdown[m]["time_seconds"] += (a.active_time or 0.0)

        mode_list = []
        for m, v in mode_breakdown.items():
            c = v["cards"]
            mode_list.append({
                "mode": m,
                "cards": c,
                "correct": v["correct"],
                "accuracy": round((v["correct"] / c) * 100) if c > 0 else 0,
                "study_minutes": round(v["time_seconds"] / 60.0, 1)
            })
        mode_list.sort(key=lambda x: x["cards"], reverse=True)

        # 9. Roadmap Goals Completed Today
        today_date_str = today_local_date.strftime("%Y-%m-%d")
        goals_res = await db.execute(
            select(UserDailyProgress, UserDeckGoal, FlashcardDeck)
            .join(UserDeckGoal, UserDailyProgress.goal_id == UserDeckGoal.id)
            .join(FlashcardDeck, UserDeckGoal.deck_id == FlashcardDeck.id)
            .where(
                UserDeckGoal.user_id == user_id,
                UserDailyProgress.date == today_date_str
            )
        )
        today_goals = []
        for prog, goal, deck in goals_res.all():
            today_goals.append({
                "goal_id": goal.id,
                "deck_id": goal.deck_id,
                "deck_title": deck.title,
                "deck_cover": deck.cover_image,
                "target": goal.daily_target,
                "done_today": prog.count_done,
                "is_target_met": prog.is_target_met or (prog.count_done >= goal.daily_target)
            })

        return {
            "date_str": today_local_date.strftime("%A, %b %d, %Y"),
            "date_iso": today_local_date.isoformat(),
            "summary": {
                "total_cards": total_cards_studied,
                "new_cards": new_cards_learned,
                "reviewed_cards": cards_reviewed,
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "accuracy": accuracy,
                "total_time_seconds": round(active_time_seconds),
                "total_time_minutes": study_minutes,
                "total_sessions": len(sessions_data),
                "first_session_time": first_study_time,
                "last_session_time": last_study_time,
                "xp_earned": today_xp,
                "points_earned": today_pts,
                "streak_count": gamify.streak_count if gamify else 0,
                "streak_freeze_count": gamify.streak_freeze_count if gamify else 0,
                "streak_completed_today": (total_cards_studied > 0)
            },
            "sessions": sessions_data,
            "hourly_activity": hourly_counts,
            "mode_breakdown": mode_list,
            "decks_studied": decks_summary,
            "roadmap_goals": today_goals
        }

