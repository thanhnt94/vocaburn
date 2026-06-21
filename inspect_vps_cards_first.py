import paramiko

host = "103.121.91.217"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=username, password=password, timeout=10)

sqlite_cmd = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); cursor = conn.cursor(); [print(r) for r in cursor.execute('SELECT id, content FROM flashcards WHERE quiz_id = 4 ORDER BY id ASC LIMIT 20').fetchall()]\""
stdin, stdout, stderr = ssh.exec_command(sqlite_cmd)
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
