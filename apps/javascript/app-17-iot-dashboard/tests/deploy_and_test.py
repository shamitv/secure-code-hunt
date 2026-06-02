"""
Deploy app-17 to the benchmark VM (192.168.96.110) and run end-to-end smoke tests.
Usage: python tests/deploy_and_test.py
"""
import paramiko
import time
import json
import os
import tarfile
import io

VM_HOST = "192.168.96.110"
VM_USER = "yolo1"
VM_PASS = "yolo1"
APP_DIR = "/home/yolo1/app-17-test"
LOCAL_APP = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())


def run(cmd, timeout=120, echo=True):
    if echo:
        print(f"  $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if echo:
        if out:
            print(out)
        if err and exit_code != 0:
            print(f"  [stderr] {err}")
    return exit_code, out, err


def upload_dir(local_path, remote_path):
    """Upload directory via tar over SFTP."""
    print(f"Uploading {local_path} -> {remote_path}")
    sftp = ssh.open_sftp()
    try:
        # Create parent dirs
        run(f"mkdir -p {remote_path}", echo=False)
        # Tar locally, extract remotely
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz') as tar:
            tar.add(local_path, arcname='.')
        buf.seek(0)
        with sftp.open(f"{remote_path}/archive.tar.gz", 'wb') as f:
            f.write(buf.read())
        run(f"cd {remote_path} && tar xzf archive.tar.gz && rm archive.tar.gz", timeout=60, echo=False)
    finally:
        sftp.close()
    print("Upload complete.")


def wait_for_healthy(service, retries=30, delay=5):
    """Wait for a Docker service to be healthy."""
    print(f"  Waiting for {service} to be healthy...", end="")
    for i in range(retries):
        code, out, _ = run(
            f"docker inspect --format='{{{{.State.Health.Status}}}}' app-17-test-{service}-1 2>/dev/null || "
            f"docker inspect --format='{{{{.State.Health.Status}}}}' app-17-test_web_1 2>/dev/null || echo 'not found'",
            timeout=10, echo=False
        )
        status = out.strip()
        if status == "healthy":
            print(f" healthy (after {i * delay}s)")
            return True
        if i < retries - 1:
            print(".", end="", flush=True)
            time.sleep(delay)
    print(" FAILED")
    return False


def main():
    print("=== Deploy and Test app-17 IoT Dashboard ===")
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, look_for_keys=False, allow_agent=False)
    print("SSH connected.")

    # Clean any previous run
    run(f"rm -rf {APP_DIR}")

    # Upload source
    upload_dir(LOCAL_APP, APP_DIR)

    # Build and start
    print("\nBuilding Docker images...")
    run(f"cd {APP_DIR} && docker compose build", timeout=180)
    print("\nStarting services...")
    run(f"cd {APP_DIR} && docker compose up -d", timeout=60)

    # Wait for all services
    print("\nWaiting for services to become healthy...")
    services = ["postgres", "redis", "kafka", "elasticsearch", "web"]
    for svc in services:
        wait_for_healthy(svc)

    # Extra wait for app readiness
    time.sleep(5)

    # ---- Smoke Tests ----
    BASE = "http://localhost:8017"
    print(f"\n{'='*60}")
    print("SMOKE TESTS")
    print(f"{'='*60}")

    results = []

    def test(name, method, url, expected_status=200, body=None, use_cookie=False, save_cookie=False):
        full_url = f"{BASE}{url}"
        cookie_flag = ""
        if save_cookie:
            cookie_flag = " -c /tmp/cookies.txt"
        elif use_cookie:
            cookie_flag = " -b /tmp/cookies.txt"
        if body:
            cmd = f"curl -s -o /tmp/resp.json -w '%{{http_code}}' -X {method} '{full_url}' -H 'Content-Type: application/json' -d '{json.dumps(body)}'{cookie_flag}"
        else:
            cmd = f"curl -s -o /tmp/resp.json -w '%{{http_code}}' '{full_url}'{cookie_flag}"

        code, out, err = run(cmd, timeout=15, echo=False)
        actual_code = out.strip()
        _, resp_body, _ = run("cat /tmp/resp.json 2>/dev/null || echo '{}'", timeout=5, echo=False)

        ok = actual_code == str(expected_status)
        status = "PASS" if ok else f"FAIL (expected {expected_status}, got {actual_code})"
        results.append((name, status))
        print(f"  [{status}] {method} {url} -> {actual_code}")
        if not ok:
            print(f"    Response: {resp_body[:200]}")
        return resp_body, actual_code

    # 1. Health check
    test("Health", "GET", "/api/health")

    # 2. Register (auth returns 201)
    test("Register", "POST", "/api/auth/register", expected_status=201, body={"username": "test_vm", "password": "test_vm_pass"})

    # 3. Login (save cookie)
    resp, _ = test("Login", "POST", "/api/auth/login", body={"username": "alice_owner", "password": "alice123"}, save_cookie=True)

    # 4. Device detail
    test("Device detail", "GET", "/api/devices/1", use_cookie=True)

    # 5. Device command
    test("Device command", "POST", "/api/devices/command",
         body={"deviceId": 1, "command": "PING"}, use_cookie=True)

    # 6. TRIGGER-ERROR (A05 leak) - Expect 500 with leaked gateway_config in body
    resp, _ = test("Trigger error (A05 leak)", "POST", "/api/devices/command",
                   body={"deviceId": 1, "command": "TRIGGER-ERROR"}, expected_status=500, use_cookie=True)
    try:
        err_data = json.loads(resp)
        if "gateway_config" in err_data:
            print(f"    [INFO] Leaked telemetry_url: {err_data['gateway_config'].get('telemetry_server_url')}")
    except json.JSONDecodeError:
        pass

    # 7. Internal telemetry (A02 leak)
    test("Internal telemetry (A02)", "GET",
         "/api/internal/telemetry?token=INTERNAL-SECRET-TELEMETRY-TOKEN-2026")

    # 8. Device telemetry (IDOR - A01)
    test("Device telemetry (A01 IDOR)", "GET", "/api/devices/1/telemetry", use_cookie=True)

    # 9. Telemetry query (SQLi - A03)
    resp, _ = test("Telemetry query (A03 SQLi)", "POST", "/api/devices/1/telemetry/query",
                   body={"filter": "1=1"}, use_cookie=True)
    try:
        query_data = json.loads(resp)
        print(f"    [INFO] Filtered results count: {len(query_data.get('results', []))}")
    except json.JSONDecodeError:
        pass

    # 10. Telemetry range (safe decoy)
    test("Telemetry range (safe)", "GET",
         "/api/devices/1/telemetry/range?from=2000-01-01&to=2100-01-01", use_cookie=True)

    # 11. Diagnostics search (A03 ES DSLi)
    test("Diagnostics search (A03 ES)", "GET",
         "/api/diagnostics/search?q=*:*", use_cookie=True)

    # 12. Diagnostics safe search (decoy)
    test("Diagnostics safe search", "GET",
         "/api/diagnostics/search/safe?name=Thermostat", use_cookie=True)

    # 13. Dashboard HTML
    test("Dashboard HTML", "GET", "/dashboard")

    # ---- Summary ----
    print(f"\n{'='*60}")
    print("RESULTS SUMMARY")
    print(f"{'='*60}")
    passed = sum(1 for _, s in results if s == "PASS")
    failed = sum(1 for _, s in results if "FAIL" in s)
    for name, status in results:
        print(f"  [{status}] {name}")
    print(f"\nPassed: {passed}/{len(results)}, Failed: {failed}")

    # ---- Tear Down ----
    print(f"\n{'='*60}")
    print("TEARING DOWN")
    print(f"{'='*60}")
    run(f"cd {APP_DIR} && docker compose down -v", timeout=60)
    run("docker system prune -a -f --volumes", timeout=60)
    run(f"rm -rf {APP_DIR}")
    ssh.close()
    print("Tear down complete.")

    return failed == 0


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
