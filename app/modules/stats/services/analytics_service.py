from sqlalchemy import select, func, desc, extract, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.deck.models import UserAnswer, FlashcardDeck, Flashcard, Category, DeckAttempt
from app.modules.auth.models import User
from app.modules.stats.models import UserDailyStats
from app.modules.gamification.models import UserGamification
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
    async def get_user_detailed_stats(db: AsyncSession, user_id: int):
        user_stats = await AnalyticsService._get_user_stats_internal(db, user_id)
        global_stats = await AnalyticsService.get_global_stats(db)
        
        return {
            "personal": user_stats,
            "global": global_stats
        }

    @staticmethod
    async def _get_user_stats_internal(db: AsyncSession, user_id: int):
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
        hour_stmt = select(
            extract('hour', UserAnswer.created_at).label("hour"),
            func.count(UserAnswer.id).label("count")
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == user_id)\
         .group_by("hour")
         
        hour_results = await db.execute(hour_stmt)
        hourly_data = {i: 0 for i in range(24)}
        for row in hour_results.all():
            h = int(row[0]) if row[0] is not None else 0
            hourly_data[h] = row[1]
        
        hourly_formatted = [{"hour": f"{h:02d}:00", "count": count} for h, count in hourly_data.items()]

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
    async def get_leaderboard(db: AsyncSession, current_user_id: int):
        # 1. Fetch current user's baseline data
        curr_game_res = await db.execute(
            select(UserGamification).where(UserGamification.user_id == current_user_id)
        )
        curr_game = curr_game_res.scalar_one_or_none()
        curr_xp = curr_game.xp if curr_game else 0
        curr_streak = curr_game.streak_count if curr_game else 0

        # Current user's daily stats aggregates
        curr_stats_res = await db.execute(
            select(
                func.sum(UserDailyStats.questions_attempted).label("total_q"),
                func.sum(UserDailyStats.correct_answers).label("total_c")
            ).where(UserDailyStats.user_id == current_user_id)
        )
        curr_stats = curr_stats_res.one_or_none()
        curr_total_q = curr_stats.total_q if curr_stats else 0
        curr_total_c = curr_stats.total_c if curr_stats else 0
        curr_acc = (curr_total_c * 100.0 / curr_total_q) if curr_total_q > 0 else 0.0

        # Helper to format rows
        async def execute_and_format_leaderboard(stmt):
            res = await db.execute(stmt)
            out = []
            for rank_idx, row in enumerate(res.all(), 1):
                out.append({
                    "rank": rank_idx,
                    "user_id": row[0],
                    "username": row[1],
                    "full_name": row[2] or row[1],
                    "value": row[3] or 0,
                    "level": row[4] or 1
                })
            return out

        # --- XP LEADERBOARD ---
        xp_stmt = select(
            User.id, User.username, User.full_name,
            UserGamification.xp.label("value"), UserGamification.level
        ).select_from(User).join(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(UserGamification.xp)).limit(50)
        xp_list = await execute_and_format_leaderboard(xp_stmt)

        xp_rank_res = await db.execute(
            select(func.count(User.id)).select_from(User)
            .join(UserGamification, User.id == UserGamification.user_id)
            .where(UserGamification.xp > curr_xp)
        )
        xp_rank = xp_rank_res.scalar() + 1

        # --- STREAK LEADERBOARD ---
        streak_stmt = select(
            User.id, User.username, User.full_name,
            UserGamification.streak_count.label("value"), UserGamification.level
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
        q_subq = select(
            UserDailyStats.user_id,
            func.sum(UserDailyStats.questions_attempted).label("total_q")
        ).group_by(UserDailyStats.user_id).subquery()

        q_stmt = select(
            User.id, User.username, User.full_name,
            q_subq.c.total_q.label("value"), UserGamification.level
        ).select_from(User).join(q_subq, User.id == q_subq.c.user_id)\
         .outerjoin(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(q_subq.c.total_q)).limit(50)
        q_list = await execute_and_format_leaderboard(q_stmt)

        q_rank_sub = select(
            UserDailyStats.user_id
        ).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > curr_total_q).subquery()
        q_rank_res = await db.execute(select(func.count()).select_from(q_rank_sub))
        q_rank = q_rank_res.scalar() + 1

        # --- ACCURACY LEADERBOARD (min 20 questions) ---
        acc_subq = select(
            UserDailyStats.user_id,
            (func.sum(UserDailyStats.correct_answers) * 100.0 / func.sum(UserDailyStats.questions_attempted)).label("acc")
        ).group_by(UserDailyStats.user_id)\
         .having(func.sum(UserDailyStats.questions_attempted) >= 20)\
         .subquery()

        acc_stmt = select(
            User.id, User.username, User.full_name,
            acc_subq.c.acc.label("value"), UserGamification.level
        ).select_from(User).join(acc_subq, User.id == acc_subq.c.user_id)\
         .outerjoin(UserGamification, User.id == UserGamification.user_id)\
         .order_by(desc(acc_subq.c.acc)).limit(50)
        
        acc_res = await db.execute(acc_stmt)
        acc_list = []
        for rank_idx, row in enumerate(acc_res.all(), 1):
            acc_list.append({
                "rank": rank_idx,
                "user_id": row[0],
                "username": row[1],
                "full_name": row[2] or row[1],
                "value": round(row[3] or 0.0, 1),
                "level": row[4] or 1
            })

        if curr_total_q >= 20:
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
        
        # 1. Total and unique reviews per day
        reviews_stmt = select(
            func.date(UserAnswer.created_at).label("date_str"),
            func.count(UserAnswer.id).label("total_reviews"),
            func.count(func.distinct(UserAnswer.card_id)).label("unique_cards")
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
        
        # Query to count how many cards were first answered on each day
        new_cards_stmt = select(
            func.date(first_answers.c.first_answered_at).label("date_str"),
            func.count(first_answers.c.card_id).label("new_cards")
        ).where(
            first_answers.c.first_answered_at >= start_date
        ).group_by(
            func.date(first_answers.c.first_answered_at)
        )
        
        reviews_res, new_cards_res = await asyncio.gather(
            db.execute(reviews_stmt),
            db.execute(new_cards_stmt)
        )
        
        daily_map = {}
        for i in range(14):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            daily_map[d_str] = {
                "date": d_str,
                "new_cards": 0,
                "unique_cards": 0,
                "total_reviews": 0
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
                
        for row in new_cards_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str in daily_map:
                daily_map[d_str]["new_cards"] = row.new_cards or 0
                
        return [daily_map[k] for k in sorted(daily_map.keys())]

