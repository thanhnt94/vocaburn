import sqlite3
import os
import paramiko

def update_local():
    local_db = r"C:\Code\Ecosystem\Storage\database\Vocaburn.db"
    if not os.path.exists(local_db):
        print(f"Local database not found at {local_db}")
        return
    
    print("Updating local database...")
    conn = sqlite3.connect(local_db)
    cursor = conn.cursor()
    cursor.execute("UPDATE user_card_mastery SET is_ignored = 0 WHERE is_ignored IS NULL")
    conn.commit()
    print(f"Updated {cursor.rowcount} rows in local database.")
    conn.close()

def update_vps():
    print("Connecting to VPS to update remote database...")
    host = "mindstack.click"
    username = "root"
    password = "M@tkh@ut0tnh@t"
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        print("Connected! Executing sqlite update on VPS...")
        
        # Run SQLite update using python3
        cmd = "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/Storage/database/Vocaburn.db'); c = conn.cursor(); c.execute('UPDATE user_card_mastery SET is_ignored = 0 WHERE is_ignored IS NULL'); conn.commit(); print(c.rowcount)\""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if error:
            print(f"Error executing remote query: {error}")
        else:
            print(f"Remote database updated. Rows changed: {output}")
            
    except Exception as e:
        print(f"VPS Connection/Query Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    update_local()
    update_vps()
