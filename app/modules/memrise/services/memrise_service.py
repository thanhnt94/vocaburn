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
from app.modules.deck.utils import resolve_effective_study_settings, migrate_practice_settings

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
        practice_settings = migrate_practice_settings(deck.practice_settings if (deck and deck.practice_settings) else {})
        mcq_pairs = practice_settings.get("mcq", {}).get("active_pairs", [])
        typing_pairs = practice_settings.get("typing", {}).get("active_pairs", [])
        listening_pairs = practice_settings.get("listening", {}).get("active_pairs", [])

        # Stage 2 MCQ pair (pair 0)
        mcq_pair_0 = mcq_pairs[0] if mcq_pairs else {"q": "front", "a": "back"}
        mcq_q_col_2 = mcq_pair_0.get("q") or mcq_pair_0.get("prompt_col") or "front"
        mcq_a_col_2 = mcq_pair_0.get("a") or mcq_pair_0.get("answer_col") or "back"
        if isinstance(mcq_a_col_2, list) and mcq_a_col_2:
            mcq_a_col_2 = mcq_a_col_2[0]

        # Stage 3 MCQ pair: If multiple pairs configured, take pair 1 (different from pair 0); else use pair 0 (no manual reverse)
        mcq_pair_1 = mcq_pairs[1] if len(mcq_pairs) > 1 else mcq_pair_0
        mcq_q_col_3 = mcq_pair_1.get("q") or mcq_pair_1.get("prompt_col") or "front"
        mcq_a_col_3 = mcq_pair_1.get("a") or mcq_pair_1.get("answer_col") or "back"
        if isinstance(mcq_a_col_3, list) and mcq_a_col_3:
            mcq_a_col_3 = mcq_a_col_3[0]

        # Typing pair: exactly as configured in deck
        typing_pair = typing_pairs[0] if typing_pairs else {"q": "back", "a": ["front"]}
        typing_q_col = typing_pair.get("q") or typing_pair.get("prompt_col") or "back"
        typing_a_cols = typing_pair.get("a") or typing_pair.get("answer_col") or ["front"]
        if isinstance(typing_a_cols, str):
            typing_a_cols = [c.strip() for c in typing_a_cols.split(",") if c.strip()]

        # Listening pair: exactly as configured in deck
        listening_pair = listening_pairs[0] if listening_pairs else {"q": "front", "a": ["front"]}
        listening_q_col = listening_pair.get("q") or listening_pair.get("prompt_col") or "front"
        listening_a_cols = listening_pair.get("a") or listening_pair.get("answer_col") or ["front"]
        if isinstance(listening_a_cols, str):
            listening_a_cols = [c.strip() for c in listening_a_cols.split(",") if c.strip()]

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

            card_data = cls._card_to_dict(c)
            payload = {
                "card_id": c.id,
                "stage": stage,
                "front": c.front,
                "back": c.back,
                "others": c.others,
                "is_bloomed": progress.is_bloomed
            }

            # Generate interaction payloads for ALL stages so queue transitions are seamless
            mcq_config_stage2 = {'q_col': mcq_q_col_2, 'a_col': mcq_a_col_2, 'num_choices': 4}
            mcq_config_stage3 = {'q_col': mcq_q_col_3, 'a_col': mcq_a_col_3, 'num_choices': 4}
            typing_config = {'q_col': typing_q_col, 'a_cols': typing_a_cols}
            listening_config = {'q_col': listening_q_col, 'a_cols': listening_a_cols}

            payload["mcq_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config_stage2)
            payload["mcq_rev_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config_stage3)
            payload["typing_data"] = TypingEngine.generate_question(card_data, typing_config)
            payload["listening_data"] = TypingEngine.generate_question(card_data, listening_config)
            payload["audio_data"] = {
                "audio_url": (c.others.get(f"{listening_q_col}_audio_url") or c.others.get('front_audio_url') or c.others.get('back_audio_url')) if c.others else None,
                "audio_col": listening_q_col
            }

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
            "cards": session_cards,
            "practice_settings": practice_settings
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
        
        practice_settings = migrate_practice_settings(deck.practice_settings if (deck and deck.practice_settings) else {})
        mcq_pairs = practice_settings.get("mcq", {}).get("active_pairs", [])
        typing_pairs = practice_settings.get("typing", {}).get("active_pairs", [])
        listening_pairs = practice_settings.get("listening", {}).get("active_pairs", [])

        mcq_pair_0 = mcq_pairs[0] if mcq_pairs else {"q": "front", "a": "back"}
        mcq_q_col_0 = mcq_pair_0.get("q") or mcq_pair_0.get("prompt_col") or "front"
        mcq_a_col_0 = mcq_pair_0.get("a") or mcq_pair_0.get("answer_col") or "back"
        if isinstance(mcq_a_col_0, list) and mcq_a_col_0:
            mcq_a_col_0 = mcq_a_col_0[0]

        typing_pair = typing_pairs[0] if typing_pairs else {"q": "back", "a": ["front"]}
        typing_q_col = typing_pair.get("q") or typing_pair.get("prompt_col") or "back"
        typing_a_cols = typing_pair.get("a") or typing_pair.get("answer_col") or ["front"]
        if isinstance(typing_a_cols, str):
            typing_a_cols = [c.strip() for c in typing_a_cols.split(",") if c.strip()]

        listening_pair = listening_pairs[0] if listening_pairs else {"q": "front", "a": ["front"]}
        listening_q_col = listening_pair.get("q") or listening_pair.get("prompt_col") or "front"
        listening_a_cols = listening_pair.get("a") or listening_pair.get("answer_col") or ["front"]
        if isinstance(listening_a_cols, str):
            listening_a_cols = [c.strip() for c in listening_a_cols.split(",") if c.strip()]

        all_cards_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id)
        all_cards_res = await db.execute(all_cards_stmt)
        all_cards_data = [cls._card_to_dict(c) for c in all_cards_res.scalars().all()]

        session_cards = []
        for p_idx, p in enumerate(progresses):
            c = await db.scalar(select(Flashcard).where(Flashcard.id == p.card_id))
            if not c: continue

            card_data = cls._card_to_dict(c)
            
            # Randomly pick a test type for watering: mcq, typing, or audio (dictation)
            test_type = random.choice(["mcq", "typing", "audio"])

            payload = {
                "card_id": c.id,
                "test_type": test_type,
                "watering_level": p.watering_level,
                "front": c.front,
                "back": c.back,
                "others": c.others,
            }

            # Select configured MCQ pair (if multiple pairs, distribute across cards; otherwise pair 0, strictly no reverse)
            if len(mcq_pairs) > 1:
                cur_mcq_pair = mcq_pairs[p_idx % len(mcq_pairs)]
                cur_mcq_q = cur_mcq_pair.get("q") or cur_mcq_pair.get("prompt_col") or "front"
                cur_mcq_a = cur_mcq_pair.get("a") or cur_mcq_pair.get("answer_col") or "back"
                if isinstance(cur_mcq_a, list) and cur_mcq_a:
                    cur_mcq_a = cur_mcq_a[0]
            else:
                cur_mcq_q, cur_mcq_a = mcq_q_col_0, mcq_a_col_0

            mcq_config = {'q_col': cur_mcq_q, 'a_col': cur_mcq_a, 'num_choices': 4}
            typing_config = {'q_col': typing_q_col, 'a_cols': typing_a_cols}
            listening_config = {'q_col': listening_q_col, 'a_cols': listening_a_cols}

            payload["mcq_data"] = MCQEngine.generate_question(card_data, all_cards_data, mcq_config)
            payload["typing_data"] = TypingEngine.generate_question(card_data, typing_config)
            payload["listening_data"] = TypingEngine.generate_question(card_data, listening_config)
            payload["audio_data"] = {
                "audio_url": (c.others.get(f"{listening_q_col}_audio_url") or c.others.get('front_audio_url') or c.others.get('back_audio_url')) if c.others else None,
                "audio_col": listening_q_col
            }

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
            "cards": session_cards,
            "practice_settings": practice_settings
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
