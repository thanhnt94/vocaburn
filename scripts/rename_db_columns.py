import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "Storage", "database", "Vocaburn.db"))

print(f"Connecting to database at: {DB_PATH}")
if not os.path.exists(DB_PATH):
    print("Database path not found! Check directory structure.")
    exit(1)

# Back up the database first
backup_path = DB_PATH + ".bak"
print(f"Creating backup at {backup_path}...")
import shutil
shutil.copy2(DB_PATH, backup_path)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

migrations = [
    # 1. flashcards: quiz_id -> deck_id, content -> front
    ("flashcards", "quiz_id", "deck_id"),
    ("flashcards", "content", "front"),
    # 2. deck_attempts: quiz_id -> deck_id, total_questions -> total_cards
    ("deck_attempts", "quiz_id", "deck_id"),
    ("deck_attempts", "total_questions", "total_cards"),
    # 3. card_answers: question_id -> card_id
    ("card_answers", "question_id", "card_id"),
    # 4. deck_sessions: quiz_id -> deck_id
    ("deck_sessions", "quiz_id", "deck_id"),
    # 5. user_card_notes: question_id -> card_id
    ("user_card_notes", "question_id", "card_id"),
    # 6. deck_tags: quiz_id -> deck_id
    ("deck_tags", "quiz_id", "deck_id"),
    # 7. deck_rooms: quiz_id -> deck_id
    ("deck_rooms", "quiz_id", "deck_id"),
    # 8. deck_collaborators: quiz_id -> deck_id
    ("deck_collaborators", "quiz_id", "deck_id"),
    # 9. user_deck_goals: quiz_id -> deck_id
    ("user_deck_goals", "quiz_id", "deck_id"),
    # 10. user_card_mastery: question_id -> card_id
    ("user_card_mastery", "question_id", "card_id"),
    # 11. user_practice_stats: question_id -> card_id
    ("user_practice_stats", "question_id", "card_id"),
]

for table, old_col, new_col in migrations:
    try:
        # Check if the table and column exist
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        if old_col in columns:
            print(f"Renaming column {old_col} to {new_col} in table {table}...")
            cursor.execute(f"ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col};")
        else:
            print(f"Column {old_col} already renamed or not found in table {table}.")
    except Exception as e:
        print(f"Error migrating {table}.{old_col}: {e}")

conn.commit()
conn.close()
print("Database naming migration completed successfully!")
