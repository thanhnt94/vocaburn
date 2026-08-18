"""fix_mastery_state_and_learned_count

Revision ID: a8b9c0d1e2f3
Revises: f92b41cd8712
Create Date: 2026-08-18 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, Sequence[str], None] = 'f92b41cd8712'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()

    # 1. Fix existing user_card_mastery rows where state was stuck at 0 despite card being studied
    conn.execute(sa.text("""
        UPDATE user_card_mastery
        SET state = CASE 
                WHEN stability >= 3.0 THEN 2
                ELSE 1
            END,
            box_level = CASE
                WHEN stability >= 10.0 AND COALESCE(consecutive_correct, 0) >= 3 THEN 5
                WHEN stability >= 3.0 THEN 4
                ELSE 2
            END
        WHERE state = 0 AND (last_review IS NOT NULL OR stability IS NOT NULL);
    """))

    # 2. Backfill user_card_mastery for any answered cards that somehow missed mastery record
    conn.execute(sa.text("""
        INSERT INTO user_card_mastery (user_id, card_id, box_level, consecutive_correct, state, stability, difficulty, step, due, last_review, is_ignored)
        SELECT 
            a.user_id,
            ua.card_id,
            2 as box_level,
            1 as consecutive_correct,
            1 as state,
            1.0 as stability,
            5.0 as difficulty,
            0 as step,
            MAX(ua.created_at) as due,
            MAX(ua.created_at) as last_review,
            FALSE as is_ignored
        FROM card_answers ua
        JOIN deck_attempts a ON ua.attempt_id = a.id
        LEFT JOIN user_card_mastery m ON m.user_id = a.user_id AND m.card_id = ua.card_id
        WHERE m.id IS NULL
        GROUP BY a.user_id, ua.card_id;
    """))

def downgrade() -> None:
    pass
