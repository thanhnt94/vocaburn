"""Add front_font_size to user_global_settings

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f8b0
Create Date: 2026-09-07 00:32:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f8b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'front_font_size' not in columns:
            op.add_column('user_global_settings', sa.Column('front_font_size', sa.String(20), nullable=True, server_default='100%'))

def downgrade() -> None:
    pass
