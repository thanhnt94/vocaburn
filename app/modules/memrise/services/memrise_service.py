import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.memrise.models import MemriseCardProgress, MemriseSession
from app.modules.deck.models import Flashcard, FlashcardDeck, UserDeckSettings
from app.modules.deck.services.mcq_engine import MCQEngine
from app.modules.deck.services.typing_engine import TypingEngine
from app.modules.deck.utils import resolve_effective_study_settings

class MemriseService:
    WATERING_INTERVALS = [
        timedelta(hours=4),
        timedelta(hours=12),
        timedelta(days=1),
        timedelta(days=6),
        timedelta(days=12),
        timedelta(days=48),
        timedelta(days=96),
        timedelta(days=180)
    ]

    @classmethod
    async def get_plant_session(cls, db: AsyncSession, user_id: int, deck_id: int, limit: int = 10) -> Dict:
        """Fetch unseen/learning cards for a planting session."""
        # 1. Fetch unseen cards (no progress or stage < 6)
        stmt = (
            select(Flashcard)
            .outerjoin(
                MemriseCardProgress, 
                and_(MemriseCardProgress.card_id == Flashcard.id, MemriseCardProgress.user_id == user_id)
            )
            .where(
                Flashcard.deck_id == deck_id,
                or_(MemriseCardProgress.id == None, MemriseCardProgress.is_bloomed == False)
            )
            .order_by(Flashcard.id)
            .limit(limit)
        )
        result = await db.execute(stmt)
        cards = result.scalars().all()

        if not cards:
            return {"cards": [], "message": "No new cards to plant."}

        # 2. Get deck settings for Q/A mapping
        deck = await db.scalar(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
        user_settings = await db.scalar(select(UserDeckSettings).where(UserDeckSettings.user_id == user_id, UserDeckSettings.deck_id == deck_id))
        practice_config = resolve_effective_study_settings(deck, user_settings)
        q_col = practice_config.get("question_col", "front")
        a_col = practice_config.get("answer_col", "back")

        # 3. Get all deck cards for MCQ distractors
        all_cards_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
        all_cards_res = await db.execute(all_cards_stmt)
        all_cards = all_cards_res.scalars().all()
        all_cards_data = [cls._card_to_dict(c) for c in all_cards]

        # 4. Build session data
        session_cards = []
        for c in cards:
            progress = await cls._get_or_create_progress(db, user_id, deck_id, c.id)
            stage = progress.stage

            # If audio doesn't exist, skip stage 4
            has_audio = bool(c.others and (c.others.get('front_audio_url') or c.others.get('back_audio_url')))
            if stage == 4 and not has_audio:
                stage = 5  # Skip to typing
                progress.stage = 5
                await db.flush()

            card_data = cls._card_to_dict(c)
            payload = {
                "card_id": c.id,
                "stage": stage,
                "front": c.front,
                "back": c.back,
                "others": c.others,
                "is_bloomed": progress.is_bloomed
            }

            # Generate interaction payload based on stage
            if stage in (2, 3):
                # Reverse for stage 3
                mcq_config = {'q_col': a_col if stage == 3 else q_col, 'a_col': q_col if stage == 3 else a_col, 'num_choices': 4}
                payload["mcq_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config)
            elif stage == 4:
                # Audio MCQ or typing? We can default to typing engine for validation if it's text input, or just MCQ
                payload["audio_data"] = {"audio_url": c.others.get('front_audio_url') or c.others.get('back_audio_url')}
                # Generate MCQ for audio stage as well
                mcq_config = {'q_col': q_col, 'a_col': a_col, 'num_choices': 4}
                payload["mcq_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config)
            elif stage == 5:
                typing_config = {'q_col': q_col, 'a_cols': a_col}
                payload["typing_data"] = TypingEngine.generate_question(card_data, typing_config)

            session_cards.append(payload)

        # 5. Create a session record
        session = MemriseSession(
            user_id=user_id,
            deck_id=deck_id,
            session_type="plant",
            cards_studied=len(session_cards)
        )
        db.add(session)
        await db.commit()

        return {
            "session_id": session.id,
            "cards": session_cards
        }

    @classmethod
    async def get_water_session(cls, db: AsyncSession, user_id: int, deck_id: int) -> Dict:
        """Fetch bloomed cards that are due for watering."""
        now = datetime.utcnow()
        stmt = (
            select(MemriseCardProgress)
            .where(
                MemriseCardProgress.user_id == user_id,
                MemriseCardProgress.deck_id == deck_id,
                MemriseCardProgress.is_bloomed == True,
                MemriseCardProgress.next_water_at <= now
            )
            .order_by(MemriseCardProgress.next_water_at)
            .limit(20) # Batch size
        )
        result = await db.execute(stmt)
        progresses = result.scalars().all()

        if not progresses:
            return {"cards": [], "message": "Your garden is fully watered!"}

        deck = await db.scalar(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
        user_settings = await db.scalar(select(UserDeckSettings).where(UserDeckSettings.user_id == user_id, UserDeckSettings.deck_id == deck_id))
        practice_config = resolve_effective_study_settings(deck, user_settings)
        q_col = practice_config.get("question_col", "front")
        a_col = practice_config.get("answer_col", "back")

        all_cards_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
        all_cards_res = await db.execute(all_cards_stmt)
        all_cards_data = [cls._card_to_dict(c) for c in all_cards_res.scalars().all()]

        session_cards = []
        for p in progresses:
            c = await db.scalar(select(Flashcard).where(Flashcard.id == p.card_id))
            if not c: continue

            card_data = cls._card_to_dict(c)
            
            # Randomly pick a test type for watering
            test_type = random.choice(["mcq", "typing"])
            has_audio = bool(c.others and (c.others.get('front_audio_url') or c.others.get('back_audio_url')))
            if has_audio and random.random() < 0.3:
                test_type = "audio"

            payload = {
                "card_id": c.id,
                "test_type": test_type,
                "watering_level": p.watering_level,
                "front": c.front,
                "back": c.back,
                "others": c.others,
            }

            if test_type in ("mcq", "audio"):
                mcq_config = {'q_col': q_col, 'a_col': a_col, 'num_choices': 4}
                payload["mcq_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config)
                if test_type == "audio":
                    payload["audio_data"] = {"audio_url": c.others.get('front_audio_url') or c.others.get('back_audio_url')}
            elif test_type == "typing":
                typing_config = {'q_col': q_col, 'a_cols': a_col}
                payload["typing_data"] = TypingEngine.generate_question(card_data, typing_config)

            session_cards.append(payload)

        session = MemriseSession(
            user_id=user_id,
            deck_id=deck_id,
            session_type="water",
            cards_studied=len(session_cards)
        )
        db.add(session)
        await db.commit()

        return {
            "session_id": session.id,
            "cards": session_cards
        }

    @classmethod
    async def submit_answer(cls, db: AsyncSession, user_id: int, card_id: int, is_correct: bool, session_type: str) -> Dict:
        """Process an answer and update the card's progress."""
        progress = await db.scalar(
            select(MemriseCardProgress).where(
                MemriseCardProgress.user_id == user_id, 
                MemriseCardProgress.card_id == card_id
            )
        )
        if not progress:
            return {"error": "Card not in Memrise progress"}

        now = datetime.utcnow()
        progress.last_reviewed_at = now
        
        if is_correct:
            progress.total_correct += 1
            progress.streak += 1
        else:
            progress.total_wrong += 1
            progress.streak = 0

        action = ""

        if session_type == "plant" and not progress.is_bloomed:
            if is_correct:
                progress.stage += 1
                action = "advanced"
                if progress.stage >= 6:
                    progress.is_bloomed = True
                    progress.bloom_count = 1
                    progress.watering_level = 0
                    progress.next_water_at = now + cls.WATERING_INTERVALS[0]
                    action = "bloomed"
            else:
                progress.stage = 1 # Reset to introduce
                action = "reset_plant"
        
        elif session_type == "water" and progress.is_bloomed:
            if is_correct:
                progress.watering_level = min(progress.watering_level + 1, len(cls.WATERING_INTERVALS) - 1)
                action = "watered"
            else:
                progress.watering_level = 0
                action = "wilted"
            
            interval = cls.WATERING_INTERVALS[progress.watering_level]
            progress.next_water_at = now + interval

        await db.commit()
        return {
            "status": "success",
            "action": action,
            "new_stage": progress.stage,
            "is_bloomed": progress.is_bloomed,
            "watering_level": progress.watering_level,
            "next_water_at": progress.next_water_at.isoformat() if progress.next_water_at else None
        }

    @classmethod
    async def _get_or_create_progress(cls, db: AsyncSession, user_id: int, deck_id: int, card_id: int) -> MemriseCardProgress:
        progress = await db.scalar(
            select(MemriseCardProgress).where(MemriseCardProgress.user_id == user_id, MemriseCardProgress.card_id == card_id)
        )
        if not progress:
            # Stage 1 automatically
            progress = MemriseCardProgress(
                user_id=user_id,
                card_id=card_id,
                deck_id=deck_id,
                stage=1
            )
            db.add(progress)
            await db.flush()
        return progress

    @classmethod
    def _card_to_dict(cls, card: Flashcard) -> Dict:
        return {
            "id": card.id,
            "front": card.front,
            "back": card.back,
            "others": card.others or {}
        }
