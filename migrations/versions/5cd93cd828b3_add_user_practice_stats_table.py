"""add user_practice_stats table

Revision ID: 5cd93cd828b3
Revises: 1d4704bd1918
Create Date: 2026-06-09 21:56:04.256985

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cd93cd828b3'
down_revision: Union[str, Sequence[str], None] = '1d4704bd1918'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'user_practice_stats' not in tables:
        op.create_table(
            'user_practice_stats',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('question_id', sa.Integer(), nullable=True),
            sa.Column('practice_mode', sa.String(length=50), nullable=True),
            sa.Column('correct_count', sa.Integer(), nullable=True),
            sa.Column('wrong_count', sa.Integer(), nullable=True),
            sa.Column('total_time_spent', sa.Float(), nullable=True),
            sa.Column('last_practiced', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['question_id'], ['flashcards.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.UniqueConstraint('user_id', 'question_id', 'practice_mode', name='uq_user_card_mode')
        )
        op.create_index(op.f('ix_user_practice_stats_id'), 'user_practice_stats', ['id'], unique=False)
        op.create_index(op.f('ix_user_practice_stats_question_id'), 'user_practice_stats', ['question_id'], unique=False)
        op.create_index(op.f('ix_user_practice_stats_user_id'), 'user_practice_stats', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'user_practice_stats' in tables:
        op.drop_index(op.f('ix_user_practice_stats_user_id'), table_name='user_practice_stats')
        op.drop_index(op.f('ix_user_practice_stats_question_id'), table_name='user_practice_stats')
        op.drop_index(op.f('ix_user_practice_stats_id'), table_name='user_practice_stats')
        op.drop_table('user_practice_stats')

