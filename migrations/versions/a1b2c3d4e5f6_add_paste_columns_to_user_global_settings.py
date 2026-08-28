"""Add paste_columns to user_global_settings

Revision ID: a1b2c3d4e5f6
Revises: f52071c6fe5a
Create Date: 2026-08-28 21:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f52071c6fe5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'paste_columns' not in columns:
            op.add_column('user_global_settings', sa.Column('paste_columns', sa.JSON(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'paste_columns' in columns:
            op.drop_column('user_global_settings', 'paste_columns')
