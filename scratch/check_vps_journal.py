import paramiko

host = "103.121.91.217"
username = "root"
password = "M@tkh@ut0tnh@t"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=username, password=password, timeout=10)

command = "journalctl -u vocaburn -n 1000 --no-pager | grep -i Adding"
stdin, stdout, stderr = ssh.exec_command(command)
print(stdout.read().decode())
ssh.close()
