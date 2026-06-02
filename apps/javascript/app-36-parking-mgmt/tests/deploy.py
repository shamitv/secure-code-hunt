"""
Deploy app-36 to VM, run smoke tests, and tear down.

Usage:
    python deploy.py
"""

import paramiko
import os
import time
import json
import sys

HOST = '192.168.96.110'
PORT = 22
USER = 'yolo1'
PASS = 'yolo1'
REMOTE_DIR = '/home/yolo1/app-36-parking-mgmt'
LOCAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {'node_modules', '.git', '__pycache__'}

def upload_dir(sftp, local, remote):
    """Recursively upload a directory via SFTP."""
    os.makedirs = os.makedirs if hasattr(os, 'makedirs') else os.makedirs
    for item in os.listdir(local):
        if item in EXCLUDE_DIRS:
            continue
        local_path = os.path.join(local, item)
        remote_path = os.path.join(remote, item).replace('\\', '/')
        if os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except FileNotFoundError:
                sftp.mkdir(remote_path)
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

def run_ssh(ssh, command, label=None, timeout=120):
    """Run a command over SSH and print output."""
    if label:
        print(f'[{label}] {command}')
    else:
        print(f'  $ {command}')
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n'):
            try:
                print(line)
            except UnicodeEncodeError:
                print(line.encode('utf-8', errors='replace').decode('ascii', errors='replace'))
    if err:
        for line in err.split('\n'):
            try:
                print(f'  ! {line}')
            except UnicodeEncodeError:
                print(line.encode('utf-8', errors='replace').decode('ascii', errors='replace'))
    return exit_code, out, err

def main():
    print('Connecting to VM...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASS, look_for_keys=False, allow_agent=False)
    print(f'Connected to {USER}@{HOST}')

    # Check Docker
    print('\n=== Checking Docker availability ===')
    rc, _, _ = run_ssh(ssh, 'docker --version')
    if rc != 0:
        print('ERROR: Docker not found on VM')
        ssh.close()
        return 1
    rc, _, _ = run_ssh(ssh, 'docker compose version')
    if rc != 0:
        print('ERROR: docker compose not found on VM')
        ssh.close()
        return 1

    # Upload source files
    print('\n=== Uploading source files ===')
    sftp = ssh.open_sftp()
    try:
        sftp.stat(REMOTE_DIR)
    except FileNotFoundError:
        sftp.mkdir(REMOTE_DIR)
    upload_dir(sftp, LOCAL_DIR, REMOTE_DIR)
    sftp.close()
    print('Upload complete')

    # Install npm dependencies
    print('\n=== Installing npm dependencies ===')
    run_ssh(ssh, f'cd {REMOTE_DIR} && npm install', timeout=180)

    # Build and start containers
    print('\n=== Building and starting Docker containers ===')
    run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose up --build -d', timeout=900)

    # Wait for health
    print('\n=== Waiting for containers to be healthy ===')
    max_retries = 30
    for i in range(max_retries):
        rc, out, _ = run_ssh(ssh, f'curl -sf http://localhost:8036/api/health', timeout=5)
        if rc == 0:
            print('  App is healthy!')
            break
        if i == max_retries - 1:
            print('  Timeout waiting for app to become healthy')
            # Continue anyway to get partial results
        else:
            print(f'  Waiting... ({i+1}/{max_retries})')
            time.sleep(5)

    # Run smoke tests
    print('\n=== Running exploit smoke tests ===')
    rc, out, _ = run_ssh(ssh, f'cd {REMOTE_DIR} && node tests/exploit-smoke.test.js', timeout=120)
    print(f'\nSmoke test exit code: {rc}')

    # Tear down
    print('\n=== Tearing down Docker containers ===')
    run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose down -v', timeout=120)
    run_ssh(ssh, 'docker system prune -a -f --volumes', timeout=120)
    print('\nTear-down complete')

    ssh.close()
    print(f'\nDone. Smoke tests {"PASSED" if rc == 0 else "FAILED"}')
    return rc

if __name__ == '__main__':
    import sys
    sys.exit(main())
