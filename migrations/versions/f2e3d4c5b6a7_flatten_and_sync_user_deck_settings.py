"""Flatten and sync user deck study settings

Revision ID: f2e3d4c5b6a7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-06 10:45:00.000000

"""
import json
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'f2e3d4c5b6a7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STUDY_KEYS = {
    "autoplay_audio", "show_images", "learning_mode", 
    "front_valign", "front_halign", "back_valign", "back_halign", 
    "random_enabled", "sfx_enabled", "haptic_enabled", 
    "quick_learn_enabled", "show_fsrs", "card_flip_trigger", "card_rating_mode"
}

def upgrade() -> None:
    conn = op.get_bind()
    
    # Query all user_deck_settings rows
    try:
        rows = conn.execute(text("SELECT id, settings FROM user_deck_settings")).fetchall()
    except Exception:
        return

    for row in rows:
        row_id, raw_settings = row[0], row[1]
        if not raw_settings:
            continue
        
        try:
            if isinstance(raw_settings, str):
                settings_dict = json.loads(raw_settings)
            elif isinstance(raw_settings, dict):
                settings_dict = dict(raw_settings)
            else:
                continue
        except Exception:
            continue

        if not isinstance(settings_dict, dict):
            continue

        modified = False
        raw_study = settings_dict.get("study_settings")

        # 1. Unpack study_settings to root if not present at root
        if isinstance(raw_study, dict):
            for k in STUDY_KEYS:
                if k in raw_study and raw_study[k] is not None:
                    if k not in settings_dict:
                        settings_dict[k] = raw_study[k]
                        modified = True
                    else:
                        # Root key is authoritative: sync it into study_settings
                        if raw_study.get(k) != settings_dict[k]:
                            raw_study[k] = settings_dict[k]
                            modified = True

        # 2. Also ensure any root keys are present in study_settings
        if isinstance(raw_study, dict):
            for k in STUDY_KEYS:
                if k in settings_dict and settings_dict[k] is not None:
                    if raw_study.get(k) != settings_dict[k]:
                        raw_study[k] = settings_dict[k]
                        modified = True

        if modified:
            new_json = json.dumps(settings_dict)
            conn.execute(
                text("UPDATE user_deck_settings SET settings = :sett WHERE id = :id"),
                {"sett": new_json, "id": row_id}
            )

def downgrade() -> None:
    pass
