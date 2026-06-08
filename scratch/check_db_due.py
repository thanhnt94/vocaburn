import sqlite3
import datetime

db_path = r"C:\Code\Ecosystem\Storage\database\Vocaburn.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("UserCardMastery count:")
cursor.execute("SELECT count(*) FROM user_card_mastery")
print("Total rows:", cursor.fetchone()[0])

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = 1")
print("Rows for user 1:", cursor.fetchone()[0])

now = datetime.datetime.utcnow().isoformat()
print("Current UTC:", now)

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = 1 AND is_ignored = 0 AND due <= ?", (now,))
print("Due rows (due <= now):", cursor.fetchone()[0])

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = 1 AND is_ignored = 0 AND due <= ? AND state != 0", (now,))
print("Due reviews (state != 0):", cursor.fetchone()[0])

cursor.execute("SELECT state, count(*) FROM user_card_mastery WHERE user_id = 1 GROUP BY state")
print("States breakdown:")
for row in cursor.fetchall():
    print(f"State {row[0]}: {row[1]}")

conn.close()
