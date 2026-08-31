from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.modules.deck.models import FlashcardDeck, Flashcard, DeckCollaborator
from app.modules.auth.models import User

class DeckInterface:
    """
    Domain interface for the Deck module adhering to Modular Monolith architecture.
    Provides decoupled access methods for external modules.
    """

    @staticmethod
    async def get_deck(db: AsyncSession, deck_id: int) -> Optional[FlashcardDeck]:
        result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def check_user_deck_permission(
        db: AsyncSession, 
        deck_id: int, 
        user_id: Optional[int], 
        allow_collaborator: bool = True
    ) -> bool:
        """
        Check if user has management permissions (Creator, Collaborator, or Admin).
        """
        if not user_id:
            return False

        # 1. Check if user is system admin
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if user and (getattr(user, "role", "") == "admin" or getattr(user, "is_admin", False)):
            return True

        # 2. Check deck ownership
        deck = await DeckInterface.get_deck(db, deck_id)
        if not deck:
            return False

        if deck.creator_id == user_id:
            return True

        # 3. Check collaborator access if allowed
        if allow_collaborator:
            collab_res = await db.execute(
                select(DeckCollaborator).where(
                    DeckCollaborator.deck_id == deck_id,
                    DeckCollaborator.user_id == user_id
                )
            )
            if collab_res.scalar_one_or_none():
                return True

        return False

    @staticmethod
    async def check_card_permission(
        db: AsyncSession, 
        card_id: int, 
        user_id: Optional[int]
    ) -> bool:
        """
        Check if user has permission to modify/delete a specific card.
        """
        if not user_id:
            return False

        card_res = await db.execute(select(Flashcard).where(Flashcard.id == card_id))
        card = card_res.scalar_one_or_none()
        if not card:
            return False

        return await DeckInterface.check_user_deck_permission(
            db=db, 
            deck_id=card.deck_id, 
            user_id=user_id, 
            allow_collaborator=True
        )
