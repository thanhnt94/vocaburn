import paramiko
import sys

def check_vps():
    sys.stdout.reconfigure(encoding='utf-8')
    host = "mindstack.click"
    username = "root"
    password = "M@tkh@ut0tnh@t"
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        print("[+] Connected to VPS!")
        
        # Check git log in vocaburn directory
        stdin, stdout, stderr = ssh.exec_command("cd /root/Vocaburn && git log -n 1 --oneline")
        print("[Git Last Commit]:", stdout.read().decode('utf-8', errors='ignore').strip())
        
        # Check systemd status
        stdin, stdout, stderr = ssh.exec_command("systemctl status vocaburn --no-pager")
        print("\n[Service Status]:\n", stdout.read().decode('utf-8', errors='ignore').strip())
        
    except Exception as e:
        print("[-] Error:", e)
    finally:
        ssh.close()

if __name__ == "__main__":
    check_vps()
