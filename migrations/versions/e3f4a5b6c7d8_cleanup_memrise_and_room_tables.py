"""Cleanup memrise and room tables

Revision ID: e3f4a5b6c7d8
Revises: a2b3c4d5e6f7
Create Date: 2026-10-23 20:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Drop child tables first
    tables_to_drop = [
        'deck_room_chats',
        'deck_room_participants',
        'deck_rooms',
        'memrise_sessions',
        'memrise_card_progress',
    ]

    for table_name in tables_to_drop:
        if table_name in existing_tables:
            op.drop_table(table_name)


def downgrade() -> None:
    pass
