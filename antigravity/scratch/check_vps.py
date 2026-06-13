import paramiko

def main():
    host = "103.121.91.217"
    username = "root"
    password = "M@tkh@ut0tnh@t"
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        print("[+] SSH Connected successfully.")
        
        # Check systemctl status of vocaburn
        stdin, stdout, stderr = ssh.exec_command("systemctl status vocaburn", get_pty=True)
        print("\n=== SYSTEMD STATUS ===")
        print(stdout.read().decode('utf-8'))
        
        # Check latest logs from journalctl for vocaburn
        stdin, stdout, stderr = ssh.exec_command("journalctl -u vocaburn -n 20 --no-pager", get_pty=True)
        print("\n=== JOURNALCTL LOGS ===")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print(f"[-] Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
