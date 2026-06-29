import sqlite3
import os

db_path = '../Storage/database/Vocaburn.db'
if not os.path.exists(db_path):
    # Try local path
    db_path = 'vocaburn.db'

print(f"Checking database at: {os.path.abspath(db_path)}")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE flashcard_decks ADD COLUMN is_public BOOLEAN DEFAULT 1 NOT NULL")
        conn.commit()
        print("Successfully added column is_public to flashcard_decks table.")
    except Exception as e:
        print(f"Info/Error: {e}")
    finally:
        conn.close()
else:
    print("Database file not found.")
