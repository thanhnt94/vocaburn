"""add_hint_and_mnemonic_columns

Revision ID: 26ded67bfdbd
Revises: 5cd93cd828b3
Create Date: 2026-06-13 10:29:03.153292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26ded67bfdbd'
down_revision: Union[str, Sequence[str], None] = '5cd93cd828b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check flashcards columns
    flashcards_cols = [c['name'] for c in inspector.get_columns('flashcards')]
    if 'hint' not in flashcards_cols:
        op.add_column('flashcards', sa.Column('hint', sa.Text(), nullable=True))
    if 'mnemonic' not in flashcards_cols:
        op.add_column('flashcards', sa.Column('mnemonic', sa.Text(), nullable=True))
        
    # Check flashcard_decks columns
    decks_cols = [c['name'] for c in inspector.get_columns('flashcard_decks')]
    if 'ai_prompt_hint' not in decks_cols:
        op.add_column('flashcard_decks', sa.Column('ai_prompt_hint', sa.Text(), nullable=True))
    if 'ai_prompt_mnemonic' not in decks_cols:
        op.add_column('flashcard_decks', sa.Column('ai_prompt_mnemonic', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    flashcards_cols = [c['name'] for c in inspector.get_columns('flashcards')]
    with op.batch_alter_table('flashcards') as batch_op:
        if 'hint' in flashcards_cols:
            batch_op.drop_column('hint')
        if 'mnemonic' in flashcards_cols:
            batch_op.drop_column('mnemonic')
        
    decks_cols = [c['name'] for c in inspector.get_columns('flashcard_decks')]
    with op.batch_alter_table('flashcard_decks') as batch_op:
        if 'ai_prompt_hint' in decks_cols:
            batch_op.drop_column('ai_prompt_hint')
        if 'ai_prompt_mnemonic' in decks_cols:
            batch_op.drop_column('ai_prompt_mnemonic')

