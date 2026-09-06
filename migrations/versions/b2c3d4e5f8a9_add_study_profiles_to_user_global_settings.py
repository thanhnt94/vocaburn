"""Add study_profiles and active_profile_id to user_global_settings

Revision ID: b2c3d4e5f8a9
Revises: a1b2c3d4e5f7
Create Date: 2026-09-06 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f8a9'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'study_profiles' not in columns:
            op.add_column('user_global_settings', sa.Column('study_profiles', sa.JSON(), nullable=True))
        if 'active_profile_id' not in columns:
            op.add_column('user_global_settings', sa.Column('active_profile_id', sa.String(50), nullable=True))

def downgrade() -> None:
    pass
