import paramiko

host = "mindstack.click"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(hostname=host, username=username, password=password, timeout=10)
    stdin, stdout, stderr = ssh.exec_command("ps aux | grep python")
    print("--- Running Python Processes ---")
    for l in stdout.readlines():
        print(l.strip())
        
    stdin, stdout, stderr = ssh.exec_command("find / -name Vocaburn.db 2>/dev/null")
    print("--- DB files ---")
    for l in stdout.readlines():
        print(l.strip())
except Exception as e:
    print("Error:", e)
finally:
    ssh.close()
