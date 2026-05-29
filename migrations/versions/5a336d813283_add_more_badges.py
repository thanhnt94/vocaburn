"""add_more_badges

Revision ID: 5a336d813283
Revises: d79399ea8337
Create Date: 2026-05-29 20:42:16.871946

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a336d813283'
down_revision: Union[str, Sequence[str], None] = 'd79399ea8337'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("INSERT INTO badges (id, name, description, icon, criteria_type, criteria_value) VALUES ('level_up_novice', 'Level 5 Cadet', 'Reach Level 5 to prove your vocabulary capability', 'Zap', 'xp', 4000)")
    op.execute("INSERT INTO badges (id, name, description, icon, criteria_type, criteria_value) VALUES ('streak_god', 'Streak God', 'Reach a 30-day learning streak. Absolute legend status!', 'Flame', 'streak', 30)")
    op.execute("INSERT INTO badges (id, name, description, icon, criteria_type, criteria_value) VALUES ('card_grandmaster', 'Card Grandmaster', 'Elevate 100 cards to Box Level 5 (Mastered)', 'Trophy', 'mastery', 100)")
    op.execute("INSERT INTO badges (id, name, description, icon, criteria_type, criteria_value) VALUES ('goal_conqueror', 'Goal Conqueror', 'Reach your daily goal 10 times. Consistency is key!', 'Trophy', 'goals', 10)")
    op.execute("INSERT INTO badges (id, name, description, icon, criteria_type, criteria_value) VALUES ('xp_collector', 'XP Collector', 'Accumulate a total of 10,000 XP', 'Trophy', 'xp', 10000)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM badges WHERE id IN ('level_up_novice', 'streak_god', 'card_grandmaster', 'goal_conqueror', 'xp_collector')")
