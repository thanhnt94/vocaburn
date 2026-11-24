"""Rename explanation column to back in flashcards

Revision ID: c2d3e4f5a6b7
Revises: b4c5d6e7f8a9
Create Date: 2026-11-24 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('flashcards')]

    # Rename physical column explanation -> back
    if 'explanation' in cols and 'back' not in cols:
        with op.batch_alter_table('flashcards') as batch_op:
            batch_op.alter_column('explanation', new_column_name='back')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('flashcards')]

    if 'back' in cols and 'explanation' not in cols:
        with op.batch_alter_table('flashcards') as batch_op:
            batch_op.alter_column('back', new_column_name='explanation')
