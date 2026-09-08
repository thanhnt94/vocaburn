"""Add folders and folder_decks tables

Revision ID: e2f3a4b5c6d7
Revises: d2e3f4a5b6c8
Create Date: 2026-09-08 20:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'folders' not in tables:
        op.create_table(
            'folders',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('cover_image', sa.String(length=512), nullable=True),
            sa.Column('color', sa.String(length=50), nullable=True, server_default='orange'),
            sa.Column('is_public', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now())
        )
        op.create_index('ix_folders_user_id', 'folders', ['user_id'])

    if 'folder_decks' not in tables:
        op.create_table(
            'folder_decks',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('folder_id', sa.Integer(), sa.ForeignKey('folders.id', ondelete='CASCADE'), nullable=False),
            sa.Column('deck_id', sa.Integer(), sa.ForeignKey('flashcard_decks.id', ondelete='CASCADE'), nullable=False),
            sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('added_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.UniqueConstraint('folder_id', 'deck_id', name='uq_folder_deck')
        )
        op.create_index('ix_folder_decks_folder', 'folder_decks', ['folder_id'])
        op.create_index('ix_folder_decks_deck', 'folder_decks', ['deck_id'])

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'folder_decks' in tables:
        op.drop_table('folder_decks')
    if 'folders' in tables:
        op.drop_table('folders')
