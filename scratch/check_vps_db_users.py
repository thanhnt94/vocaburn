import paramiko
import sys

host = "mindstack.click"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(hostname=host, username=username, password=password, timeout=10)
    
    # 1. Find Vocaburn.db path
    stdin, stdout, stderr = ssh.exec_command("find / -name Vocaburn.db 2>/dev/null")
    db_paths = [line.strip() for line in stdout.readlines()]
    if not db_paths:
        print("No DB found")
        sys.exit(1)
        
    db_path = db_paths[0]
    
    # 2. Run query to get user details and due counts
    query = """
sqlite3 {db} "
SELECT id, username FROM users;
SELECT user_id, count(*), sum(case when is_ignored=0 and datetime(due) <= datetime('now') then 1 else 0 end) FROM user_card_mastery GROUP BY user_id;
SELECT id, title FROM flashcard_decks;
SELECT deck_id, user_id, status FROM user_deck_goals;
"
""".format(db=db_path)

    stdin, stdout, stderr = ssh.exec_command(query)
    print("--- Users ---")
    lines = stdout.readlines()
    for l in lines:
        print(l.strip())
        
except Exception as e:
    print("Error:", e)
finally:
    ssh.close()
