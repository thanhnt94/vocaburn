"""Add deck settings and card composite indexes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-31 01:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_index(inspector: Inspector, table_name: str, index_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. user_deck_settings (user_id, deck_id)
    if 'user_deck_settings' in inspector.get_table_names():
        if not _has_index(inspector, 'user_deck_settings', 'ix_user_deck_settings_user_deck'):
            op.create_index('ix_user_deck_settings_user_deck', 'user_deck_settings', ['user_id', 'deck_id'])

    # 2. flashcards (deck_id, id)
    if 'flashcards' in inspector.get_table_names():
        if not _has_index(inspector, 'flashcards', 'ix_flashcards_deck_id_id'):
            op.create_index('ix_flashcards_deck_id_id', 'flashcards', ['deck_id', 'id'])

    # 3. flashcard_decks (creator_id, is_active)
    if 'flashcard_decks' in inspector.get_table_names():
        if not _has_index(inspector, 'flashcard_decks', 'ix_flashcard_decks_creator_active'):
            op.create_index('ix_flashcard_decks_creator_active', 'flashcard_decks', ['creator_id', 'is_active'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'user_deck_settings' in inspector.get_table_names():
        if _has_index(inspector, 'user_deck_settings', 'ix_user_deck_settings_user_deck'):
            op.drop_index('ix_user_deck_settings_user_deck', table_name='user_deck_settings')

    if 'flashcards' in inspector.get_table_names():
        if _has_index(inspector, 'flashcards', 'ix_flashcards_deck_id_id'):
            op.drop_index('ix_flashcards_deck_id_id', table_name='flashcards')

    if 'flashcard_decks' in inspector.get_table_names():
        if _has_index(inspector, 'flashcard_decks', 'ix_flashcard_decks_creator_active'):
            op.drop_index('ix_flashcard_decks_creator_active', table_name='flashcard_decks')
