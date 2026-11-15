import os, pty, select, time, sys

HOST = "46.224.89.43"
USER = "root"
PASS = os.environ["DEPLOY_SSH_PASSWORD"]

# Generate SSH key if not exists
key_path = os.path.expanduser("~/.ssh/id_ed25519")
if not os.path.exists(key_path):
    os.system(f"ssh-keygen -t ed25519 -f {key_path} -N '' -q")
    print("SSH key generated")

# Function to run ssh command with password via pty
def ssh_cmd(cmd, password=PASS, timeout=60):
    full_cmd = f"ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null {USER}@{HOST} '{cmd}'"
    master, slave = pty.openpty()
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
        os.execvp("ssh", ["ssh", "-o", "StrictHostKeyChecking=accept-new",
                          "-o", "UserKnownHostsFile=/dev/null",
                          f"{USER}@{HOST}", cmd])
    else:
        os.close(slave)
        output = b""
        prompt_seen = False
        start = time.time()
        while time.time() - start < timeout:
            r, _, _ = select.select([master], [], [], 1)
            if r:
                try:
                    data = os.read(master, 4096)
                    if not data:
                        break
                    output += data
                    text = output.decode(errors='replace')
                    if "password:" in text.lower() and not prompt_seen:
                        os.write(master, (password + "\n").encode())
                        prompt_seen = True
                except OSError:
                    break
        os.waitpid(pid, 0)
        os.close(master)
        return output.decode(errors='replace')

# Test connection
print("=== Testing SSH connection ===")
result = ssh_cmd("echo 'CONNECTION_OK' && whoami && hostname && cat /etc/os-release | head -2")
print(result)
if "CONNECTION_OK" in result:
    print("\n=== SSH connection successful ===")
else:
    print("\n=== SSH connection FAILED ===")
    sys.exit(1)
