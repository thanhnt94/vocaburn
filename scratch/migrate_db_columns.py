import os
import json
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "Storage", "database", "Vocaburn.db"))

print(f"Connecting to database at: {DB_PATH}")
if not os.path.exists(DB_PATH):
    print("Database path not found! Check base directory structure.")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Migrate Cards
print("Migrating cards...")
cursor.execute("SELECT id, hint, mnemonic, ai_explanation, image, audio, others FROM flashcards")
cards = cursor.fetchall()
updated_cards = 0

for card_id, hint, mnemonic, ai_explanation, image, audio, others_str in cards:
    others = {}
    if others_str:
        try:
            others = json.loads(others_str)
        except Exception:
            others = {}
            
    if hint:
        others["hint"] = hint
    if mnemonic:
        others["mnemonic"] = mnemonic
    if ai_explanation:
        others["ai_explanation"] = ai_explanation
        
    back_img = image if image else None
    back_audio_url = audio if audio else None
    
    others_json = json.dumps(others, ensure_ascii=False)
    
    cursor.execute(
        "UPDATE flashcards SET others = ?, back_img = ?, back_audio_url = ? WHERE id = ?",
        (others_json, back_img, back_audio_url, card_id)
    )
    updated_cards += 1

# 2. Migrate Decks
print("Migrating decks...")
cursor.execute("SELECT id, ai_prompt, ai_prompt_hint, ai_prompt_mnemonic, practice_settings FROM flashcard_decks")
decks = cursor.fetchall()
updated_decks = 0

for deck_id, ai_prompt, ai_prompt_hint, ai_prompt_mnemonic, practice_settings_str in decks:
    practice_settings = {}
    if practice_settings_str:
        try:
            practice_settings = json.loads(practice_settings_str)
        except Exception:
            practice_settings = {}
            
    ai_prompts = practice_settings.get("ai_prompts", [])
    
    def upsert_prompt(col, val):
        if not val:
            return
        for p in ai_prompts:
            if p.get("column") == col or p.get("id") == col:
                p["prompt"] = val
                return
        ai_prompts.append({
            "id": col,
            "column": col,
            "title": col.upper().replace("_", " "),
            "prompt": val
        })
        
    upsert_prompt("ai_explanation", ai_prompt)
    upsert_prompt("hint", ai_prompt_hint)
    upsert_prompt("mnemonic", ai_prompt_mnemonic)
    
    practice_settings["ai_prompts"] = ai_prompts
    ps_json = json.dumps(practice_settings, ensure_ascii=False)
    
    cursor.execute(
        "UPDATE flashcard_decks SET practice_settings = ? WHERE id = ?",
        (ps_json, deck_id)
    )
    updated_decks += 1

conn.commit()
conn.close()
print(f"Migration completed! Migrated {updated_cards} cards and {updated_decks} decks.")
