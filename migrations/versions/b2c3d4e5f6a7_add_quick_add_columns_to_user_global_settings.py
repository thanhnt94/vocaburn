"""Add quick_add_columns to user_global_settings

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-28 22:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'quick_add_columns' not in columns:
            op.add_column('user_global_settings', sa.Column('quick_add_columns', sa.JSON(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'quick_add_columns' in columns:
            op.drop_column('user_global_settings', 'quick_add_columns')
