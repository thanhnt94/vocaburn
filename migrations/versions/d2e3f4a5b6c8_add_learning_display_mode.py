"""Add learning_display_mode to user_global_settings

Revision ID: d2e3f4a5b6c8
Revises: d1e2f3a4b5c7
Create Date: 2026-09-07 20:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c8'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'learning_display_mode' not in columns:
            op.add_column('user_global_settings', sa.Column('learning_display_mode', sa.String(20), nullable=True, server_default='shortcuts'))

def downgrade() -> None:
    pass
