"""Add auto_next_delay to user_global_settings

Revision ID: a2b3c4d5e6f7
Revises: ff0c37f1c666
Create Date: 2026-09-20 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'ff0c37f1c666'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'user_global_settings' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'auto_next_delay' not in columns:
            op.add_column('user_global_settings', sa.Column('auto_next_delay', sa.Integer(), nullable=True))

def downgrade() -> None:
    pass
