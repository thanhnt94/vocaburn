"""Add home layout and deck order settings to user_global_settings

Revision ID: d1e2f3a4b5c7
Revises: c1d2e3f4a5b6
Create Date: 2026-09-07 20:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c7'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'home_active_tab' not in columns:
            op.add_column('user_global_settings', sa.Column('home_active_tab', sa.String(20), nullable=True, server_default='roadmap'))
        if 'roadmap_display_mode' not in columns:
            op.add_column('user_global_settings', sa.Column('roadmap_display_mode', sa.String(20), nullable=True, server_default='carousel'))
        if 'roadmap_deck_order' not in columns:
            op.add_column('user_global_settings', sa.Column('roadmap_deck_order', sa.JSON(), nullable=True))
        if 'learning_deck_order' not in columns:
            op.add_column('user_global_settings', sa.Column('learning_deck_order', sa.JSON(), nullable=True))

def downgrade() -> None:
    pass
