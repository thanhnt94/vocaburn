"""add unique constraints

Revision ID: 2960a41b8738
Revises: c04cfa2aa29e
Create Date: 2026-05-29 14:36:01.443248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2960a41b8738'
down_revision: Union[str, Sequence[str], None] = 'c04cfa2aa29e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('user_card_mastery', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_user_question', ['user_id', 'question_id'])

    with op.batch_alter_table('user_daily_progress', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_goal_date', ['goal_id', 'date'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('user_daily_progress', schema=None) as batch_op:
        batch_op.drop_constraint('uq_goal_date', type_='unique')

    with op.batch_alter_table('user_card_mastery', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_question', type_='unique')
