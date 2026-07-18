import sqlite3
import os

db_path = '../Storage/database/Vocaburn.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    decks = cursor.execute("SELECT id, title FROM flashcard_decks").fetchall()
    for d in decks:
        card_cnt = cursor.execute("SELECT COUNT(*) FROM flashcards WHERE quiz_id = ?", (d[0],)).fetchone()[0]
        print(f"Deck ID: {d[0]}, Title: {d[1]}, Cards: {card_cnt}")
        
        # Print a sample of 5 cards
        print("Sample cards:")
        samples = cursor.execute("SELECT id, content FROM flashcards WHERE quiz_id = ? LIMIT 5", (d[0],)).fetchall()
        for s in samples:
            print("  ", s)
else:
    print("DB not found")
