from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision: str = 'f52071c6fe5a'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
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
    
    if not _has_index(inspector, 'card_answers', 'ix_card_answers_attempt_card_created'):
        op.create_index('ix_card_answers_attempt_card_created', 'card_answers', ['attempt_id', 'card_id', 'created_at'])
        
    if not _has_index(inspector, 'deck_attempts', 'ix_deck_attempts_user_deck_mode'):
        op.create_index('ix_deck_attempts_user_deck_mode', 'deck_attempts', ['user_id', 'deck_id', 'mode'])
        
    if not _has_index(inspector, 'deck_sessions', 'ix_deck_sessions_user_deck_mode'):
        op.create_index('ix_deck_sessions_user_deck_mode', 'deck_sessions', ['user_id', 'deck_id', 'mode'])
        
    if not _has_index(inspector, 'user_card_mastery', 'ix_user_card_mastery_user_card_state'):
        op.create_index('ix_user_card_mastery_user_card_state', 'user_card_mastery', ['user_id', 'card_id', 'state'])
        
    if not _has_index(inspector, 'user_daily_progress', 'ix_user_daily_progress_goal_date_target'):
        op.create_index('ix_user_daily_progress_goal_date_target', 'user_daily_progress', ['goal_id', 'date', 'is_target_met'])

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if _has_index(inspector, 'card_answers', 'ix_card_answers_attempt_card_created'):
        op.drop_index('ix_card_answers_attempt_card_created', table_name='card_answers')
        
    if _has_index(inspector, 'deck_attempts', 'ix_deck_attempts_user_deck_mode'):
        op.drop_index('ix_deck_attempts_user_deck_mode', table_name='deck_attempts')
        
    if _has_index(inspector, 'deck_sessions', 'ix_deck_sessions_user_deck_mode'):
        op.drop_index('ix_deck_sessions_user_deck_mode', table_name='deck_sessions')
        
    if _has_index(inspector, 'user_card_mastery', 'ix_user_card_mastery_user_card_state'):
        op.drop_index('ix_user_card_mastery_user_card_state', table_name='user_card_mastery')
        
    if _has_index(inspector, 'user_daily_progress', 'ix_user_daily_progress_goal_date_target'):
        op.drop_index('ix_user_daily_progress_goal_date_target', table_name='user_daily_progress')
