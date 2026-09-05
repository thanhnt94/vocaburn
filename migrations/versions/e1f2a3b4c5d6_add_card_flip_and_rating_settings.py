"""Add card_flip_trigger and card_rating_mode to user_global_settings

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b8c9
Create Date: 2026-09-06 00:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'card_flip_trigger' not in columns:
            op.add_column('user_global_settings', sa.Column('card_flip_trigger', sa.String(20), nullable=True, server_default='both'))
        if 'card_rating_mode' not in columns:
            op.add_column('user_global_settings', sa.Column('card_rating_mode', sa.String(20), nullable=True, server_default='both'))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'card_rating_mode' in columns:
            op.drop_column('user_global_settings', 'card_rating_mode')
        if 'card_flip_trigger' in columns:
            op.drop_column('user_global_settings', 'card_flip_trigger')
