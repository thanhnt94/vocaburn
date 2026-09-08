"""Add daily_new_card_target

Revision ID: 8e1f3c639daa
Revises: 5a336d813283
Create Date: 2026-05-30 13:37:45.912556

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e1f3c639daa'
down_revision: Union[str, Sequence[str], None] = '5a336d813283'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'user_global_goals' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_goals')]
        if 'daily_new_card_target' not in columns:
            op.add_column('user_global_goals', sa.Column('daily_new_card_target', sa.Integer(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'user_global_goals' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_goals')]
        if 'daily_new_card_target' in columns:
            op.drop_column('user_global_goals', 'daily_new_card_target')
