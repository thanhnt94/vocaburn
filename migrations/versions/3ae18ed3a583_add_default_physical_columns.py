"""add_default_physical_columns

Revision ID: 3ae18ed3a583
Revises: 57fd335f6140
Create Date: 2026-06-29 22:51:21.676336

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ae18ed3a583'
down_revision: Union[str, Sequence[str], None] = '57fd335f6140'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('flashcards')]
    
    if 'front_audio_content' not in columns:
        op.add_column('flashcards', sa.Column('front_audio_content', sa.Text(), nullable=True))
    if 'back_audio_content' not in columns:
        op.add_column('flashcards', sa.Column('back_audio_content', sa.Text(), nullable=True))
    if 'front_audio_url' not in columns:
        op.add_column('flashcards', sa.Column('front_audio_url', sa.String(length=512), nullable=True))
    if 'back_audio_url' not in columns:
        op.add_column('flashcards', sa.Column('back_audio_url', sa.String(length=512), nullable=True))
    if 'front_img' not in columns:
        op.add_column('flashcards', sa.Column('front_img', sa.String(length=512), nullable=True))
    if 'back_img' not in columns:
        op.add_column('flashcards', sa.Column('back_img', sa.String(length=512), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('flashcards', 'front_audio_content')
    op.drop_column('flashcards', 'back_audio_content')
    op.drop_column('flashcards', 'front_audio_url')
    op.drop_column('flashcards', 'back_audio_url')
    op.drop_column('flashcards', 'front_img')
    op.drop_column('flashcards', 'back_img')
