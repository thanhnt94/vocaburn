"""Seed default study_templates in system_configs

Revision ID: b2c3d4e5f8b0
Revises: b2c3d4e5f8a9
Create Date: 2026-09-06 18:18:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import json
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f8b0'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TEMPLATES = [
    {
        "id": "preset-minimal",
        "name": "Minimalist",
        "description": "Zero distractions: no images, no audio autoplay, hidden FSRS metrics, and swipe-only without button clutter.",
        "icon": "sparkles",
        "badge": "Distraction Free",
        "is_system": True,
        "settings": {
            "autoplay_audio": "none",
            "show_images": "none",
            "learning_mode": "fsrs",
            "quiz_learning_mode": "fsrs",
            "front_valign": "center",
            "front_halign": "center",
            "back_valign": "center",
            "back_halign": "center",
            "random_enabled": False,
            "sfx_enabled": False,
            "haptic_enabled": False,
            "quick_learn_enabled": False,
            "show_fsrs": False,
            "card_flip_trigger": "tap",
            "card_rating_mode": "swipe_4way"
        }
    },
    {
        "id": "preset-full",
        "name": "Full Experience",
        "description": "All features enabled: dual-sided images, autoplay TTS audio, FSRS metrics, and combined swipe & buttons.",
        "icon": "zap",
        "badge": "All Features",
        "is_system": True,
        "settings": {
            "autoplay_audio": "always",
            "show_images": "both",
            "learning_mode": "fsrs",
            "quiz_learning_mode": "fsrs",
            "front_valign": "center",
            "front_halign": "left",
            "back_valign": "center",
            "back_halign": "left",
            "random_enabled": False,
            "sfx_enabled": True,
            "haptic_enabled": True,
            "quick_learn_enabled": False,
            "show_fsrs": True,
            "card_flip_trigger": "both",
            "card_rating_mode": "both"
        }
    },
    {
        "id": "preset-standard",
        "name": "Standard",
        "description": "Balanced recall: clean question on the front side; audio pronunciation and illustration appear only on the back side.",
        "icon": "sparkles",
        "badge": "Recommended",
        "is_system": True,
        "settings": {
            "autoplay_audio": "back",
            "show_images": "back_only",
            "learning_mode": "fsrs",
            "quiz_learning_mode": "fsrs",
            "front_valign": "center",
            "front_halign": "left",
            "back_valign": "center",
            "back_halign": "left",
            "random_enabled": False,
            "sfx_enabled": True,
            "haptic_enabled": True,
            "quick_learn_enabled": False,
            "show_fsrs": True,
            "card_flip_trigger": "both",
            "card_rating_mode": "both"
        }
    },
    {
        "id": "preset-classic",
        "name": "Classic",
        "description": "Traditional 4-button workflow: flip strictly via button so you can easily select and copy text without accidental flips.",
        "icon": "book",
        "badge": "Button Only",
        "is_system": True,
        "settings": {
            "autoplay_audio": "back",
            "show_images": "both",
            "learning_mode": "fsrs",
            "quiz_learning_mode": "fsrs",
            "front_valign": "top",
            "front_halign": "left",
            "back_valign": "top",
            "back_halign": "left",
            "random_enabled": False,
            "sfx_enabled": True,
            "haptic_enabled": True,
            "quick_learn_enabled": False,
            "show_fsrs": True,
            "card_flip_trigger": "button_only",
            "card_rating_mode": "buttons"
        }
    }
]

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'system_configs' in inspector.get_table_names():
        # Check if study_templates row exists
        check_stmt = sa.text("SELECT id FROM system_configs WHERE id = 'study_templates'")
        res = conn.execute(check_stmt).fetchone()
        if not res:
            insert_stmt = sa.text(
                "INSERT INTO system_configs (id, value, updated_at) VALUES (:id, :value, :updated_at)"
            )
            conn.execute(insert_stmt, {
                "id": "study_templates",
                "value": json.dumps(DEFAULT_TEMPLATES),
                "updated_at": datetime.utcnow()
            })

def downgrade() -> None:
    pass
