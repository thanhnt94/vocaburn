import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("103.121.91.217", username="root", password="M@tkh@ut0tnh@t")
stdin, stdout, stderr = ssh.exec_command("systemctl status vocaburn")
print("STDOUT:")
print(stdout.read().decode("utf-8"))
print("STDERR:")
print(stderr.read().decode("utf-8"))
ssh.close()
