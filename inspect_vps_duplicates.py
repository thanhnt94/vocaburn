import paramiko

host = "103.121.91.217"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=username, password=password, timeout=10)

# Check duplicate contents in Deck 4
query = "SELECT content, COUNT(*) as c FROM flashcards WHERE quiz_id = 4 GROUP BY content HAVING c > 1 ORDER BY c DESC LIMIT 15"
sqlite_cmd = f"python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); cursor = conn.cursor(); print(cursor.execute(\\\"{query}\\\").fetchall())\""
stdin, stdout, stderr = ssh.exec_command(sqlite_cmd)
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
