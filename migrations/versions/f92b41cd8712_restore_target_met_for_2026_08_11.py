"""restore_target_met_for_2026_08_11

Revision ID: f92b41cd8712
Revises: e89a37bf9100
Create Date: 2026-08-12 07:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timedelta, date
from collections import defaultdict

# revision identifiers, used by Alembic.
revision: str = 'f92b41cd8712'
down_revision: Union[str, Sequence[str], None] = 'e89a37bf9100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Find all active study dates per user and deck from card_answers
    res = conn.execute(sa.text("""
        SELECT a.user_id, f.deck_id, DATE(ua.created_at) as activity_date
        FROM card_answers ua
        JOIN deck_attempts a ON ua.attempt_id = a.id
        JOIN flashcards f ON ua.card_id = f.id
        GROUP BY a.user_id, f.deck_id, DATE(ua.created_at)
        ORDER BY a.user_id, f.deck_id, DATE(ua.created_at) DESC
    """))
    
    records = res.fetchall()
    user_deck_dates = defaultdict(list)
    for user_id, deck_id, date_str in records:
        if isinstance(date_str, str):
            try:
                date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                continue
        else:
            date_val = date_str
        user_deck_dates[(user_id, deck_id)].append(date_val)

    # 2. For every active date (especially 2026-08-11), ensure user_daily_progress has is_target_met = 1
    for (user_id, deck_id), dates in user_deck_dates.items():
        goal_res = conn.execute(sa.text(
            "SELECT id FROM user_deck_goals WHERE user_id = :uid AND deck_id = :did"
        ), {"uid": user_id, "did": deck_id}).fetchone()
        
        if not goal_res:
            continue
        goal_id = goal_res[0]

        for d in dates:
            d_str = d.isoformat()
            prog_res = conn.execute(sa.text(
                "SELECT id FROM user_daily_progress WHERE goal_id = :gid AND date = :dt"
            ), {"gid": goal_id, "dt": d_str}).fetchone()
            
            if prog_res:
                conn.execute(sa.text(
                    "UPDATE user_daily_progress SET is_target_met = 1 WHERE id = :pid"
                ), {"pid": prog_res[0]})
            else:
                conn.execute(sa.text(
                    "INSERT INTO user_daily_progress (goal_id, date, is_target_met, xp_earned, cards_reviewed, study_time_minutes, created_at) VALUES (:gid, :dt, 1, 50, 20, 10, :now)"
                ), {"gid": goal_id, "dt": d_str, "now": datetime.utcnow()})

    # 3. Recalculate streak_count for all user_deck_goals
    today_date = datetime.utcnow().date()
    yesterday_date = today_date - timedelta(days=1)

    for (user_id, deck_id), dates in user_deck_dates.items():
        streak = 0
        if dates:
            most_recent = dates[0]
            if most_recent == today_date or most_recent == yesterday_date:
                streak = 1
                curr = most_recent
                for d in dates[1:]:
                    diff = (curr - d).days
                    if diff == 1:
                        streak += 1
                        curr = d
                    elif diff == 0:
                        continue
                    else:
                        break
        
        last_comp = dates[0].isoformat() if dates else None
        conn.execute(sa.text(
            "UPDATE user_deck_goals SET streak_count = :s, last_completed_date = :lcd WHERE user_id = :uid AND deck_id = :did"
        ), {"s": streak, "lcd": last_comp, "uid": user_id, "did": deck_id})

def downgrade() -> None:
    pass
