"""cleanup_unlearned_practice_mastery

Revision ID: b1c2d3e4f5a6
Revises: a8b9c0d1e2f3
Create Date: 2026-08-19 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()

    # Delete mastery records for cards that were never studied in flashcard mode
    # (only answered during practice, MCQ, typing, listening or roadmap tests).
    # These cards must remain Brand New (state=0, unlearned) until actually studied in flashcards.
    conn.execute(sa.text("""
        DELETE FROM user_card_mastery
        WHERE id IN (
            SELECT m.id
            FROM user_card_mastery m
            WHERE NOT EXISTS (
                SELECT 1 
                FROM card_answers ua
                JOIN deck_attempts a ON ua.attempt_id = a.id
                WHERE ua.card_id = m.card_id 
                  AND a.user_id = m.user_id
                  AND a.mode IN ('play', 'roadmap', 'fsrs', 'new', 'review', 'sequential')
            )
        );
    """))

def downgrade() -> None:
    pass
