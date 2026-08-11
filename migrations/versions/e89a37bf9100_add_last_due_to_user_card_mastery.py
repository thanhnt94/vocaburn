"""add_last_due_to_user_card_mastery

Revision ID: e89a37bf9100
Revises: c75f798c40bf
Create Date: 2026-08-12 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e89a37bf9100'
down_revision: Union[str, Sequence[str], None] = 'c75f798c40bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_card_mastery', sa.Column('last_due', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_card_mastery', 'last_due')
