import paramiko
import sys

host = "mindstack.click"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(hostname=host, username=username, password=password, timeout=10)
    print("[+] Connected to VPS!")
    
    # 1. Find Vocaburn.db path
    stdin, stdout, stderr = ssh.exec_command("find / -name Vocaburn.db 2>/dev/null")
    db_paths = [line.strip() for line in stdout.readlines()]
    print("Found DB paths on VPS:", db_paths)
    
    if not db_paths:
        print("No DB found")
        sys.exit(1)
        
    db_path = db_paths[0]
    
    # 2. Run queries
    query = """
sqlite3 {db} "
SELECT count(*) FROM user_card_mastery;
SELECT count(*) FROM user_card_mastery WHERE user_id = 1;
SELECT count(*) FROM user_card_mastery WHERE user_id = 1 AND is_ignored = 0 AND datetime(due) <= datetime('now');
SELECT count(*) FROM user_card_mastery WHERE user_id = 1 AND is_ignored = 0 AND datetime(due) <= datetime('now') AND state != 0;
SELECT state, count(*) FROM user_card_mastery WHERE user_id = 1 GROUP BY state;
"
""".format(db=db_path)

    stdin, stdout, stderr = ssh.exec_command(query)
    lines = stdout.readlines()
    print("--- Query Results ---")
    print("Total rows:", lines[0].strip() if len(lines) > 0 else "N/A")
    print("User 1 rows:", lines[1].strip() if len(lines) > 1 else "N/A")
    print("Due rows (due <= now):", lines[2].strip() if len(lines) > 2 else "N/A")
    print("Due reviews (state != 0):", lines[3].strip() if len(lines) > 3 else "N/A")
    
    print("States breakdown:")
    for l in lines[4:]:
        print(l.strip())
        
except Exception as e:
    print("Error:", e)
finally:
    ssh.close()
