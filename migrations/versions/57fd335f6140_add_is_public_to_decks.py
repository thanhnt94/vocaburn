"""add_is_public_to_decks

Revision ID: 57fd335f6140
Revises: 26ded67bfdbd
Create Date: 2026-06-29 20:32:28.399215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_is_public_to_decks

Revision ID: 57fd335f6140
Revises: 26ded67bfdbd
Create Date: 2026-06-29 20:32:28.399215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57fd335f6140'
down_revision: Union[str, Sequence[str], None] = '26ded67bfdbd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # =========================================================================
    # ECOSYSTEM MIGRATION GUIDELINE:
    # Always write IDEMPOTENT migrations. Check if a table/column exists before 
    # creating/adding it. This prevents crashes if the DB is in an out-of-sync state.
    # =========================================================================
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('flashcard_decks')]
    if 'is_public' not in columns:
        op.add_column('flashcard_decks', sa.Column('is_public', sa.Boolean(), server_default='1', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('flashcard_decks')]
    if 'is_public' in columns:
        with op.batch_alter_table('flashcard_decks') as batch_op:
            batch_op.drop_column('is_public')
