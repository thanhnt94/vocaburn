"""drop_redundant_physical_columns

Revision ID: f376e525426f
Revises: 3ae18ed3a583
Create Date: 2026-06-29 22:51:59.640406

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f376e525426f'
down_revision: Union[str, Sequence[str], None] = '3ae18ed3a583'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Drop columns on flashcards
    flashcard_columns = [col['name'] for col in inspector.get_columns('flashcards')]
    with op.batch_alter_table('flashcards') as batch_op:
        if 'hint' in flashcard_columns:
            batch_op.drop_column('hint')
        if 'mnemonic' in flashcard_columns:
            batch_op.drop_column('mnemonic')
        if 'ai_explanation' in flashcard_columns:
            batch_op.drop_column('ai_explanation')
        if 'image' in flashcard_columns:
            batch_op.drop_column('image')
        if 'audio' in flashcard_columns:
            batch_op.drop_column('audio')

    # Drop columns on flashcard_decks
    deck_columns = [col['name'] for col in inspector.get_columns('flashcard_decks')]
    with op.batch_alter_table('flashcard_decks') as batch_op:
        if 'ai_prompt' in deck_columns:
            batch_op.drop_column('ai_prompt')
        if 'ai_prompt_hint' in deck_columns:
            batch_op.drop_column('ai_prompt_hint')
        if 'ai_prompt_mnemonic' in deck_columns:
            batch_op.drop_column('ai_prompt_mnemonic')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('flashcards') as batch_op:
        batch_op.add_column(sa.Column('hint', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('mnemonic', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_explanation', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('image', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('audio', sa.String(length=512), nullable=True))

    with op.batch_alter_table('flashcard_decks') as batch_op:
        batch_op.add_column(sa.Column('ai_prompt', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_prompt_hint', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_prompt_mnemonic', sa.Text(), nullable=True))
