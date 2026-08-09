"""backfill_roadmap_streaks

Revision ID: c75f798c40bf
Revises: 4189e3cf78e6
Create Date: 2026-08-09 10:50:57.559436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c75f798c40bf'
down_revision: Union[str, Sequence[str], None] = '4189e3cf78e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from datetime import datetime, timedelta

    # 1. Get all active dates per user and deck
    res = conn.execute(sa.text("""
        SELECT a.user_id, f.deck_id, DATE(ua.created_at) as activity_date
        FROM card_answers ua
        JOIN deck_attempts a ON ua.attempt_id = a.id
        JOIN flashcards f ON ua.card_id = f.id
        GROUP BY a.user_id, f.deck_id, DATE(ua.created_at)
        ORDER BY a.user_id, f.deck_id, DATE(ua.created_at) DESC
    """))
    
    records = res.fetchall()
    
    from collections import defaultdict
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
        
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    for (user_id, deck_id), dates in user_deck_dates.items():
        streak = 0
        if dates:
            if dates[0] == today or dates[0] == yesterday:
                streak = 1
                curr = dates[0]
                for d in dates[1:]:
                    if (curr - d).days == 1:
                        streak += 1
                        curr = d
                    elif (curr - d).days == 0:
                        continue
                    else:
                        break
                        
        goal_res = conn.execute(sa.text(
            "SELECT id FROM user_deck_goals WHERE user_id = :uid AND deck_id = :did"
        ), {"uid": user_id, "did": deck_id}).fetchone()
        
        last_comp = dates[0].isoformat() if dates else None
        
        if goal_res:
            goal_id = goal_res[0]
            conn.execute(sa.text(
                "UPDATE user_deck_goals SET streak_count = :s, last_completed_date = :lcd WHERE id = :gid"
            ), {"s": streak, "lcd": last_comp, "gid": goal_id})
        else:
            conn.execute(sa.text(
                "INSERT INTO user_deck_goals (user_id, deck_id, streak_count, last_completed_date, status, created_at, daily_target, daily_time_target, daily_card_target) VALUES (:uid, :did, :s, :lcd, 'active', :now, 5, 10, 20)"
            ), {"uid": user_id, "did": deck_id, "s": streak, "lcd": last_comp, "now": datetime.utcnow()})
            
            goal_res = conn.execute(sa.text(
                "SELECT id FROM user_deck_goals WHERE user_id = :uid AND deck_id = :did"
            ), {"uid": user_id, "did": deck_id}).fetchone()
            goal_id = goal_res[0]
            
        for d in dates:
            d_str = d.isoformat()
            prog_res = conn.execute(sa.text(
                "SELECT id FROM user_daily_progress WHERE goal_id = :gid AND date = :d"
            ), {"gid": goal_id, "d": d_str}).fetchone()
            if not prog_res:
                conn.execute(sa.text(
                    "INSERT INTO user_daily_progress (goal_id, date, count_done, is_target_met, created_at) VALUES (:gid, :d, 1, 1, :now)"
                ), {"gid": goal_id, "d": d_str, "now": datetime.utcnow()})


def downgrade() -> None:
    """Downgrade schema."""
    pass
