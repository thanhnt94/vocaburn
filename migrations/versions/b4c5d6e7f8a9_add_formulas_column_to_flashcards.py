"""Add formulas column to flashcards and clean others

Revision ID: b4c5d6e7f8a9
Revises: e3f4a5b6c7d8
Create Date: 2026-11-24 10:00:00.000000

"""
import json
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c['name'] for c in inspector.get_columns('flashcards')]

    # 1. Add column formulas if not present
    if 'formulas' not in existing_cols:
        with op.batch_alter_table('flashcards') as batch_op:
            batch_op.add_column(sa.Column('formulas', sa.JSON(), nullable=True))

    # 2. Get deck-level column formulas map
    deck_formulas_map = {}
    try:
        deck_rows = conn.execute(text("SELECT id, practice_settings FROM flashcard_decks")).fetchall()
        for d_id, ps_raw in deck_rows:
            if ps_raw:
                ps = json.loads(ps_raw) if isinstance(ps_raw, str) else ps_raw
                if isinstance(ps, dict) and "column_formulas" in ps:
                    deck_formulas_map[d_id] = ps["column_formulas"]
    except Exception:
        pass

    # 3. Clean up flashcards.others:
    #    - If _formulas differs from deck formulas, store override in card.formulas
    #    - Purge _formulas, _formula, back from others
    try:
        cards = conn.execute(text("SELECT id, deck_id, others, explanation FROM flashcards WHERE others IS NOT NULL")).fetchall()
        for c_id, d_id, others_raw, expl in cards:
            if not others_raw:
                continue
            others = json.loads(others_raw) if isinstance(others_raw, str) else dict(others_raw)
            if not isinstance(others, dict):
                continue

            needs_update = False
            card_formulas_override = None

            # Check formulas
            raw_card_formulas = others.get('_formulas') or others.get('_formula')
            if raw_card_formulas and isinstance(raw_card_formulas, dict):
                deck_forms = deck_formulas_map.get(d_id, {})
                # Find any custom formulas that differ from deck-level defaults
                diff_forms = {
                    k: v for k, v in raw_card_formulas.items()
                    if k not in deck_forms or deck_forms.get(k) != v
                }
                if diff_forms:
                    card_formulas_override = diff_forms

                others.pop('_formulas', None)
                others.pop('_formula', None)
                needs_update = True

            # Check redundant back key in others (explanation already contains it)
            if 'back' in others:
                # Ensure explanation is not empty before popping
                if not expl and others['back']:
                    conn.execute(
                        text("UPDATE flashcards SET explanation = :expl WHERE id = :id"),
                        {"expl": str(others['back']), "id": c_id}
                    )
                others.pop('back', None)
                needs_update = True

            if needs_update:
                update_params = {
                    "others": json.dumps(others, ensure_ascii=False),
                    "id": c_id
                }
                if card_formulas_override:
                    conn.execute(
                        text("UPDATE flashcards SET others = :others, formulas = :forms WHERE id = :id"),
                        {**update_params, "forms": json.dumps(card_formulas_override, ensure_ascii=False)}
                    )
                else:
                    conn.execute(
                        text("UPDATE flashcards SET others = :others WHERE id = :id"),
                        update_params
                    )
    except Exception as e:
        print(f"Notice: Data cleanup during migration encountered: {e}")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c['name'] for c in inspector.get_columns('flashcards')]

    if 'formulas' in existing_cols:
        with op.batch_alter_table('flashcards') as batch_op:
            batch_op.drop_column('formulas')
