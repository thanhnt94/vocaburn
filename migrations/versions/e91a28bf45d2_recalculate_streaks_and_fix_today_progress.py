"""recalculate_streaks_and_fix_today_progress

Revision ID: e91a28bf45d2
Revises: c75f798c40bf
Create Date: 2026-08-11 12:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timedelta, date
from collections import defaultdict

# revision identifiers, used by Alembic.
revision: str = 'e91a28bf45d2'
down_revision: Union[str, Sequence[str], None] = 'c75f798c40bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    today_str = datetime.utcnow().date().isoformat()
    
    # 1. Reset today's is_target_met to 0 for daily progress records created prematurely
    conn.execute(sa.text(
        "UPDATE user_daily_progress SET is_target_met = 0 WHERE date = :today"
    ), {"today": today_str})

    # 2. Recalculate streak_count for all user_deck_goals from UserDailyProgress
    goals = conn.execute(sa.text("SELECT id, user_id, deck_id FROM user_deck_goals")).fetchall()
    today_date = datetime.utcnow().date()

    for goal_id, user_id, deck_id in goals:
        progs = conn.execute(sa.text(
            "SELECT date FROM user_daily_progress WHERE goal_id = :gid AND is_target_met = 1 ORDER BY date DESC"
        ), {"gid": goal_id}).fetchall()

        met_dates = []
        for row in progs:
            d_str = row[0]
            if d_str:
                try:
                    d_obj = date.fromisoformat(d_str)
                    if d_obj == today_date:
                        continue # Today is not met yet
                    met_dates.append(d_obj)
                except Exception:
                    pass

        streak = 0
        if met_dates:
            most_recent = met_dates[0]
            if most_recent == today_date or most_recent == (today_date - timedelta(days=1)):
                streak = 1
                curr = most_recent
                for d in met_dates[1:]:
                    diff = (curr - d).days
                    if diff == 1:
                        streak += 1
                        curr = d
                    elif diff == 0:
                        continue
                    else:
                        break

        conn.execute(sa.text(
            "UPDATE user_deck_goals SET streak_count = :s WHERE id = :gid"
        ), {"s": streak, "gid": goal_id})

def downgrade() -> None:
    pass
