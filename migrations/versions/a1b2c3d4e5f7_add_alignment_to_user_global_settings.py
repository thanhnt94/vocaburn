"""Add alignment columns to user_global_settings

Revision ID: a1b2c3d4e5f7
Revises: f2e3d4c5b6a7
Create Date: 2026-09-06 12:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'f2e3d4c5b6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'front_valign' not in columns:
            op.add_column('user_global_settings', sa.Column('front_valign', sa.String(20), nullable=True, server_default='center'))
        if 'front_halign' not in columns:
            op.add_column('user_global_settings', sa.Column('front_halign', sa.String(20), nullable=True, server_default='left'))
        if 'back_valign' not in columns:
            op.add_column('user_global_settings', sa.Column('back_valign', sa.String(20), nullable=True, server_default='center'))
        if 'back_halign' not in columns:
            op.add_column('user_global_settings', sa.Column('back_halign', sa.String(20), nullable=True, server_default='left'))

def downgrade() -> None:
    pass
