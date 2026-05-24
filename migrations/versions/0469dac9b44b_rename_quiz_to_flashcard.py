"""rename_quiz_to_flashcard

Revision ID: 0469dac9b44b
Revises: ec0334756c58
Create Date: 2026-05-24 20:46:24.052009

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0469dac9b44b'
down_revision: Union[str, Sequence[str], None] = 'ec0334756c58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 1. Temporarily create options table if missing to prevent reflection errors
    options_recreated = False
    if 'options' not in tables:
        op.create_table(
            'options',
            sa.Column('id', sa.Integer(), primary_key=True)
        )
        options_recreated = True

    # 2. Drop selected_option_id column if present
    active_answers_table = 'card_answers' if 'card_answers' in tables else 'user_answers'
    if active_answers_table in tables:
        ans_cols = [c['name'] for c in insp.get_columns(active_answers_table)]
        if 'selected_option_id' in ans_cols:
            with op.batch_alter_table(active_answers_table) as batch_op:
                batch_op.drop_column('selected_option_id')

    # 3. Drop the options table
    op.drop_table('options')

    # 4. Drop points column if present
    active_cards_table = 'flashcards' if 'flashcards' in tables else 'questions'
    if active_cards_table in tables:
        card_cols = [c['name'] for c in insp.get_columns(active_cards_table)]
        if 'points' in card_cols:
            with op.batch_alter_table(active_cards_table) as batch_op:
                batch_op.drop_column('points')

    # 5. Rename tables if their old names exist
    renames = [
        ('quizzes', 'flashcard_decks'),
        ('questions', 'flashcards'),
        ('quiz_attempts', 'deck_attempts'),
        ('user_answers', 'card_answers'),
        ('quiz_sessions', 'deck_sessions'),
        ('user_question_notes', 'user_card_notes'),
        ('quiz_tags', 'deck_tags'),
        ('quiz_rooms', 'deck_rooms'),
        ('quiz_room_participants', 'deck_room_participants'),
        ('quiz_room_chats', 'deck_room_chats'),
        ('quiz_collaborators', 'deck_collaborators'),
        ('user_quiz_goals', 'user_deck_goals'),
        ('user_question_mastery', 'user_card_mastery')
    ]
    for old, new in renames:
        if old in tables and new not in tables:
            op.rename_table(old, new)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 1. Rename tables back if their new names exist
    renames = [
        ('flashcard_decks', 'quizzes'),
        ('flashcards', 'questions'),
        ('deck_attempts', 'quiz_attempts'),
        ('card_answers', 'user_answers'),
        ('deck_sessions', 'quiz_sessions'),
        ('user_card_notes', 'user_question_notes'),
        ('deck_tags', 'quiz_tags'),
        ('deck_rooms', 'quiz_rooms'),
        ('deck_room_participants', 'quiz_room_participants'),
        ('deck_room_chats', 'quiz_room_chats'),
        ('deck_collaborators', 'quiz_collaborators'),
        ('user_deck_goals', 'user_quiz_goals'),
        ('user_card_mastery', 'user_question_mastery')
    ]
    for new, old in renames:
        if new in tables and old not in tables:
            op.rename_table(new, old)

    # Re-inspect to get current table names after renames
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 2. Re-create options table if not present
    if 'options' not in tables:
        op.create_table(
            'options',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('question_id', sa.Integer()),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), default=False)
        )

    # 3. Re-add points to questions table if missing
    active_cards_table = 'questions' if 'questions' in tables else 'flashcards'
    if active_cards_table in tables:
        card_cols = [c['name'] for c in insp.get_columns(active_cards_table)]
        if 'points' not in card_cols:
            with op.batch_alter_table(active_cards_table) as batch_op:
                batch_op.add_column(sa.Column('points', sa.Integer(), server_default='1'))

    # 4. Re-add selected_option_id to user_answers if missing
    active_answers_table = 'user_answers' if 'user_answers' in tables else 'card_answers'
    if active_answers_table in tables:
        ans_cols = [c['name'] for c in insp.get_columns(active_answers_table)]
        if 'selected_option_id' not in ans_cols:
            with op.batch_alter_table(active_answers_table) as batch_op:
                batch_op.add_column(sa.Column('selected_option_id', sa.Integer(), nullable=True))
