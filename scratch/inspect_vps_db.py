import paramiko

host = "103.121.91.217"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=username, password=password, timeout=10)

# Query SQLite on VPS
command = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); cursor = conn.cursor(); print('Decks:'); print(cursor.execute('SELECT id, title, (SELECT COUNT(*) FROM flashcards WHERE quiz_id = flashcard_decks.id) FROM flashcard_decks').fetchall())\""
stdin, stdout, stderr = ssh.exec_command(command)
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
