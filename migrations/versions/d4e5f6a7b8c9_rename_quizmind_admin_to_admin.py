"""Rename quizmind admin user to admin

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-31 23:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE users 
        SET username = 'admin', full_name = 'admin' 
        WHERE id = 1 OR LOWER(username) = 'quizmind admin' OR LOWER(full_name) = 'quizmind admin'
    """))


def downgrade() -> None:
    pass
