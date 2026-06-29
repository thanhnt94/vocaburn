from sqlalchemy import func, Integer, select, case, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.deck.models import FlashcardDeck, Flashcard, Category
from app.modules.deck.schemas import DeckSchema, CardSchema

class DeckService:
    @staticmethod
    async def create_deck(db: AsyncSession, deck_data: DeckSchema):
        db_deck = FlashcardDeck(
            title=deck_data.title,
            description=deck_data.description,
            category_id=deck_data.category_id,
            creator_id=deck_data.creator_id,
            cover_image=deck_data.cover_image,
            time_limit=deck_data.time_limit,
            is_active=deck_data.is_active,
            is_public=deck_data.is_public
        )
        db.add(db_deck)
        await db.commit()
        await db.refresh(db_deck)
        return db_deck

    @staticmethod
    async def add_card(db: AsyncSession, deck_id: int, card_data: CardSchema):
        db_card = Flashcard(
            deck_id=deck_id,
            content=card_data.content,
            image=card_data.image,
            audio=card_data.audio,
            question_type=card_data.question_type,
            explanation=card_data.explanation,
            ai_explanation=card_data.ai_explanation,
            others=card_data.others
        )
        db.add(db_card)
        await db.commit()
        await db.refresh(db_card)
        return db_card

    @staticmethod
    async def bulk_add_cards(db: AsyncSession, deck_id: int, cards_data: list[CardSchema]):
        db_cards = []
        for c_data in cards_data:
            db_card = Flashcard(
                deck_id=deck_id,
                content=c_data.content,
                image=c_data.image,
                audio=c_data.audio,
                question_type=c_data.question_type,
                explanation=c_data.explanation,
                ai_explanation=c_data.ai_explanation,
                others=c_data.others
            )
            db_cards.append(db_card)
            
        db.add_all(db_cards)
        await db.commit()
        return db_cards

    @staticmethod
    async def get_decks(db: AsyncSession, skip: int = 0, limit: int = 100):
        from sqlalchemy import func
        from app.modules.deck.models import Flashcard, Tag
        
        # Select FlashcardDeck and its card count in a single efficient query
        stmt = select(
            FlashcardDeck,
            select(func.count(Flashcard.id)).where(Flashcard.deck_id == FlashcardDeck.id).scalar_subquery().label("c_count")
        ).options(selectinload(FlashcardDeck.tags)).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def set_deck_tags(db: AsyncSession, deck_id: int, tag_names: list[str]):
        from app.modules.deck.models import Tag
        
        # 1. Get or create tags
        tags = []
        for name in tag_names:
            name = name.strip().upper()
            if not name: continue
            
            result = await db.execute(select(Tag).where(Tag.name == name))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=name)
                db.add(tag)
                await db.flush()
            tags.append(tag)
            
        # 2. Assign to deck
        result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(selectinload(FlashcardDeck.tags)))
        deck = result.scalar_one_or_none()
        if deck:
            deck.tags = tags
            await db.commit()
            return True
        return False

    @staticmethod
    async def get_deck_by_id(db: AsyncSession, deck_id: int):
        result = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(
                selectinload(FlashcardDeck.tags),
                selectinload(FlashcardDeck.category)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_deck_by_id_with_cards(db: AsyncSession, deck_id: int):
        result = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(
                selectinload(FlashcardDeck.cards),
                selectinload(FlashcardDeck.tags),
                selectinload(FlashcardDeck.category)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_deck_with_stats(db: AsyncSession, deck_id: int, user_id: int = None):
        from app.modules.deck.models import UserAnswer, Flashcard, DeckAttempt
        
        result = await db.execute(
            select(FlashcardDeck).where(FlashcardDeck.id == deck_id).options(selectinload(FlashcardDeck.cards), selectinload(FlashcardDeck.tags))
        )
        deck = result.scalar_one_or_none()
        if not deck:
            return None
            
        # Get all stats for this deck's cards in one go
        stats_query = select(
            UserAnswer.card_id,
            func.count(UserAnswer.id).label("total"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time"),
            func.sum(case((UserAnswer.rating == 1, 1), else_=0)).label("again_count"),
            func.sum(case((UserAnswer.rating == 2, 1), else_=0)).label("hard_count"),
            func.sum(case((UserAnswer.rating == 3, 1), else_=0)).label("good_count"),
            func.sum(case((UserAnswer.rating == 4, 1), else_=0)).label("easy_count")
        ).join(Flashcard).where(Flashcard.deck_id == deck_id)
        
        if user_id:
            stats_query = stats_query.join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id).where(DeckAttempt.user_id == user_id)
            
        stats_query = stats_query.group_by(UserAnswer.card_id)
        
        stats_results = await db.execute(stats_query)
        stats_map = {row.card_id: row for row in stats_results}
            
        # Assign stats to each card
        for q in deck.cards:
            row = stats_map.get(q.id)
            total = row.total if row else 0
            correct = row.correct if row else 0
            
            again = int(row.again_count or 0) if row else 0
            hard = int(row.hard_count or 0) if row else 0
            good = int(row.good_count or 0) if row else 0
            easy = int(row.easy_count or 0) if row else 0
            
            # Fallback for old rows lacking direct ratings
            total_rated = again + hard + good + easy
            if total > total_rated:
                missing_correct = max(0, correct - (good + easy + hard))
                missing_incorrect = max(0, (total - correct) - again)
                good += missing_correct
                again += missing_incorrect
                
            q.stats = {
                "total": total,
                "correct": correct,
                "wrong": total - correct,
                "avg_time": round(row.avg_time if row else 0, 1),
                "again_count": again,
                "hard_count": hard,
                "good_count": good,
                "easy_count": easy
            }
        
        return deck

    @staticmethod
    async def get_today_review(db: AsyncSession, user_id: int):
        import math
        from datetime import datetime
        from sqlalchemy import select, func
        from app.modules.deck.models import DeckAttempt, UserDeckGoal, UserDailyProgress, UserCardMastery, Flashcard, FlashcardDeck
        from app.modules.gamification.models import UserDailyActivity
        
        # 1. Get interacted deck ids (not archived)
        interaction_res = await db.execute(
            select(DeckAttempt.deck_id).where(
                DeckAttempt.user_id == user_id,
                DeckAttempt.is_archived == False
            ).distinct()
        )
        my_deck_ids = {r[0] for r in interaction_res.all()}
        
        # 2. Get active goal deck ids
        goal_res = await db.execute(
            select(UserDeckGoal).options(selectinload(UserDeckGoal.deck)).where(
                UserDeckGoal.user_id == user_id,
                UserDeckGoal.status == "active"
            )
        )
        active_goals = goal_res.scalars().all()
        goal_deck_ids = {goal.deck_id for goal in active_goals}
        
        # All active decks the user is learning/reviewing
        active_deck_ids = my_deck_ids | goal_deck_ids
        
        if not active_deck_ids:
            return {
                "due_cards_count": 0,
                "decks_summary": [],
                "streak_at_risk": False,
                "estimated_minutes": 0
            }
            
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        
        # Fetch active goal configurations (map deck_id -> goal)
        goals_map = {goal.deck_id: goal for goal in active_goals}
        
        # Bulk query daily progress for active goals
        goal_ids = [goal.id for goal in active_goals]
        progress_map = {}
        if goal_ids:
            prog_res = await db.execute(
                select(UserDailyProgress).where(
                    UserDailyProgress.goal_id.in_(goal_ids),
                    UserDailyProgress.date == today_str
                )
            )
            progress_map = {p.goal_id: p for p in prog_res.scalars().all()}
            
        # --- BULK OPTIMIZATION QUERIES ---
        # 1. Fetch titles for all active decks
        deck_titles_stmt = select(FlashcardDeck.id, FlashcardDeck.title).where(
            FlashcardDeck.id.in_(active_deck_ids)
        )
        deck_titles_res = await db.execute(deck_titles_stmt)
        deck_titles_map = {row.id: row.title for row in deck_titles_res.all()}
        
        # 2. Count total cards in decks in bulk
        total_cards_stmt = select(Flashcard.deck_id, func.count(Flashcard.id)).where(
            Flashcard.deck_id.in_(active_deck_ids)
        ).group_by(Flashcard.deck_id)
        total_cards_res = await db.execute(total_cards_stmt)
        total_cards_map = {row[0]: row[1] for row in total_cards_res.all()}
        
        # 3. Count FSRS due reviews in bulk
        due_reviews_stmt = select(Flashcard.deck_id, func.count(UserCardMastery.id)).join(
            UserCardMastery, UserCardMastery.card_id == Flashcard.id
        ).where(
            Flashcard.deck_id.in_(active_deck_ids),
            UserCardMastery.user_id == user_id,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None)),
            UserCardMastery.due <= now
        ).group_by(Flashcard.deck_id)
        due_reviews_res = await db.execute(due_reviews_stmt)
        due_reviews_map = {row[0]: row[1] for row in due_reviews_res.all()}
        
        # 4. Count total attempted/learned cards in bulk
        learned_stmt = select(Flashcard.deck_id, func.count(UserCardMastery.id)).join(
            UserCardMastery, UserCardMastery.card_id == Flashcard.id
        ).where(
            Flashcard.deck_id.in_(active_deck_ids),
            UserCardMastery.user_id == user_id,
            or_(UserCardMastery.is_ignored == False, UserCardMastery.is_ignored.is_(None))
        ).group_by(Flashcard.deck_id)
        learned_res = await db.execute(learned_stmt)
        learned_map = {row[0]: row[1] for row in learned_res.all()}
        
        decks_summary = []
        total_due_review = 0
        total_due_new = 0
        
        for deck_id in active_deck_ids:
            deck_title = deck_titles_map.get(deck_id) or f"Deck {deck_id}"
            total_cards = total_cards_map.get(deck_id, 0)
            due_reviews_count = due_reviews_map.get(deck_id, 0)
            learned_count = learned_map.get(deck_id, 0)
            unattempted_count = max(0, total_cards - learned_count)
            
            # Determine due new count under active goal
            due_new_count = 0
            goal = goals_map.get(deck_id)
            if goal:
                progress = progress_map.get(goal.id)
                done_today = progress.count_done if progress else 0
                due_new_count = max(0, goal.daily_target - done_today)
                # Cap at the actual number of unattempted cards in the deck
                due_new_count = min(due_new_count, unattempted_count)
                
            if due_reviews_count > 0 or due_new_count > 0:
                decks_summary.append({
                    "deck_id": deck_id,
                    "title": deck_title,
                    "due_count": due_reviews_count,
                    "new_count": due_new_count
                })
                total_due_review += due_reviews_count
                total_due_new += due_new_count
                
        # Check if daily activity exists for today in gamification
        act_res = await db.execute(
            select(UserDailyActivity).where(
                UserDailyActivity.user_id == user_id,
                UserDailyActivity.activity_date == now.date()
            )
        )
        has_activity_today = act_res.scalar_one_or_none() is not None
        
        # Calculate estimated minutes
        estimated_minutes = math.ceil((total_due_review * 15 + total_due_new * 30) / 60)
        if (total_due_review + total_due_new) > 0 and estimated_minutes == 0:
            estimated_minutes = 1
            
        due_cards_count = total_due_review + total_due_new
        streak_at_risk = not has_activity_today and (due_cards_count > 0 or len(active_goals) > 0)
        
        return {
            "due_cards_count": due_cards_count,
            "decks_summary": decks_summary,
            "streak_at_risk": streak_at_risk,
            "estimated_minutes": estimated_minutes
        }
