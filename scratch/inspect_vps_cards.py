import paramiko

host = "103.121.91.217"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=username, password=password, timeout=10)

# Query SQLite on VPS to see card samples
commands = [
    # Get first 5 cards
    "SELECT id, content, explanation FROM flashcards WHERE quiz_id = 4 LIMIT 5",
    # Get cards between limit 710 and 720
    "SELECT id, content, explanation FROM flashcards WHERE quiz_id = 4 LIMIT 10 OFFSET 710",
    # Get last 5 cards
    "SELECT id, content, explanation FROM flashcards WHERE quiz_id = 4 ORDER BY id DESC LIMIT 5"
]

for cmd in commands:
    print(f"\n--- Running: {cmd} ---")
    sqlite_cmd = f"python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); cursor = conn.cursor(); print(cursor.execute(\\\"{cmd}\\\").fetchall())\""
    stdin, stdout, stderr = ssh.exec_command(sqlite_cmd)
    # Print using repr to avoid Windows terminal encoding errors
    print(repr(stdout.read().decode()))
    print(repr(stderr.read().decode()))

ssh.close()
