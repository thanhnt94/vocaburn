"""Add memrise models

Revision ID: ff0c37f1c666
Revises: e2f3a4b5c6d7
Create Date: 2026-09-19 11:07:04.910764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff0c37f1c666'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('memrise_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('deck_id', sa.Integer(), nullable=True),
    sa.Column('session_type', sa.String(length=20), nullable=True),
    sa.Column('cards_studied', sa.Integer(), nullable=True),
    sa.Column('correct_count', sa.Integer(), nullable=True),
    sa.Column('wrong_count', sa.Integer(), nullable=True),
    sa.Column('duration_seconds', sa.Integer(), nullable=True),
    sa.Column('started_at', sa.DateTime(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['deck_id'], ['flashcard_decks.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_memrise_sessions_deck_id'), 'memrise_sessions', ['deck_id'], unique=False)
    op.create_index(op.f('ix_memrise_sessions_id'), 'memrise_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_memrise_sessions_user_id'), 'memrise_sessions', ['user_id'], unique=False)

    op.create_table('memrise_card_progress',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('card_id', sa.Integer(), nullable=True),
    sa.Column('deck_id', sa.Integer(), nullable=True),
    sa.Column('stage', sa.Integer(), nullable=True),
    sa.Column('is_bloomed', sa.Boolean(), nullable=True),
    sa.Column('bloom_count', sa.Integer(), nullable=True),
    sa.Column('streak', sa.Integer(), nullable=True),
    sa.Column('watering_level', sa.Integer(), nullable=True),
    sa.Column('next_water_at', sa.DateTime(), nullable=True),
    sa.Column('last_reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('total_correct', sa.Integer(), nullable=True),
    sa.Column('total_wrong', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['card_id'], ['flashcards.id'], ),
    sa.ForeignKeyConstraint(['deck_id'], ['flashcard_decks.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'card_id', name='uq_memrise_user_card')
    )
    op.create_index(op.f('ix_memrise_card_progress_card_id'), 'memrise_card_progress', ['card_id'], unique=False)
    op.create_index(op.f('ix_memrise_card_progress_deck_id'), 'memrise_card_progress', ['deck_id'], unique=False)
    op.create_index(op.f('ix_memrise_card_progress_id'), 'memrise_card_progress', ['id'], unique=False)
    op.create_index('ix_memrise_card_progress_user_deck_bloomed', 'memrise_card_progress', ['user_id', 'deck_id', 'is_bloomed'], unique=False)
    op.create_index(op.f('ix_memrise_card_progress_user_id'), 'memrise_card_progress', ['user_id'], unique=False)
    op.create_index('ix_memrise_card_progress_user_water_due', 'memrise_card_progress', ['user_id', 'next_water_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_memrise_card_progress_user_water_due', table_name='memrise_card_progress')
    op.drop_index(op.f('ix_memrise_card_progress_user_id'), table_name='memrise_card_progress')
    op.drop_index('ix_memrise_card_progress_user_deck_bloomed', table_name='memrise_card_progress')
    op.drop_index(op.f('ix_memrise_card_progress_id'), table_name='memrise_card_progress')
    op.drop_index(op.f('ix_memrise_card_progress_deck_id'), table_name='memrise_card_progress')
    op.drop_index(op.f('ix_memrise_card_progress_card_id'), table_name='memrise_card_progress')
    op.drop_table('memrise_card_progress')

    op.drop_index(op.f('ix_memrise_sessions_user_id'), table_name='memrise_sessions')
    op.drop_index(op.f('ix_memrise_sessions_id'), table_name='memrise_sessions')
    op.drop_index(op.f('ix_memrise_sessions_deck_id'), table_name='memrise_sessions')
    op.drop_table('memrise_sessions')
