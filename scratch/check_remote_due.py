import paramiko

def check_remote_due():
    host = "mindstack.click"
    username = "root"
    password = "M@tkh@ut0tnh@t"
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        
        # Query total mastery rows
        cmd1 = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); c = conn.cursor(); c.execute('SELECT count(*) FROM user_card_mastery WHERE user_id = 2'); print('Total:', c.fetchone()[0])\""
        # Query is_ignored IS NULL count
        cmd2 = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); c = conn.cursor(); c.execute('SELECT count(*) FROM user_card_mastery WHERE user_id = 2 AND is_ignored IS NULL'); print('NULL ignored:', c.fetchone()[0])\""
        # Query due count where is_ignored = 0
        cmd3 = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); c = conn.cursor(); c.execute('SELECT count(*) FROM user_card_mastery WHERE user_id = 2 AND is_ignored = 0 AND due <= datetime(\\'now\\')'); print('Due count:', c.fetchone()[0])\""
        
        for name, cmd in [("Total rows", cmd1), ("NULL ignored", cmd2), ("Due count", cmd3)]:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8').strip()
            err = stderr.read().decode('utf-8').strip()
            print(f"{name}: {out} {f'(Err: {err})' if err else ''}")
            
    except Exception as e:
        print(f"Error checking VPS database: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    check_remote_due()
