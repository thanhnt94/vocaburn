import paramiko

host = "mindstack.click"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(hostname=host, username=username, password=password, timeout=10)
    sftp = ssh.open_sftp()
    
    python_code = """
import sqlite3

conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db')
cursor = conn.cursor()
user_id = 2

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = ? AND is_ignored IS NULL", (user_id,))
print("NULL is_ignored count:", cursor.fetchone()[0])

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = ? AND is_ignored = 0", (user_id,))
print("is_ignored = 0 count:", cursor.fetchone()[0])

cursor.execute("SELECT count(*) FROM user_card_mastery WHERE user_id = ? AND is_ignored = 1", (user_id,))
print("is_ignored = 1 count:", cursor.fetchone()[0])

conn.close()
"""
    with sftp.open('/tmp/query_null_ignored.py', 'w') as f:
        f.write(python_code)
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command("/var/www/Vocaburn/venv/bin/python3 /tmp/query_null_ignored.py")
    for l in stdout.readlines():
        print(l.strip())
except Exception as e:
    print(e)
finally:
    ssh.close()
