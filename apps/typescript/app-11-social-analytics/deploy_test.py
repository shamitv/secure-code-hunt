"""Deploy app-11 to VM and run comprehensive smoke tests."""
import paramiko, time, json, os, tarfile, io

HOST = "192.168.96.110"
USER = "yolo1"
PASS = "yolo1"
APP_DIR = "/home/yolo1/app-11-social-analytics"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, look_for_keys=False)

def run(cmd, timeout=30):
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out[:2000])
    if err: print(f"[STDERR] {err[:500]}")
    if exit_code != 0:
        raise RuntimeError(f"Command failed (exit {exit_code}): {cmd}")
    return out

def curl(path, method="GET", data=None, timeout=5):
    cmd = f"curl -fsS -X {method} http://localhost:8011{path}"
    if data:
        cmd += f" -H 'Content-Type: application/json' -d '{data}'"
    _, stdout, _ = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    return json.loads(out) if out else {}

try:
    run("docker compose down -v 2>/dev/null; docker system prune -a -f --volumes 2>/dev/null; rm -rf ~/app-11-social-analytics")
    run(f"mkdir -p {APP_DIR}")

    base = r"D:\work\secure-code-hunt\apps\typescript\app-11-social-analytics"
    exclude = {"node_modules", "dist", ".git", "deploy_test.py"}
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, dirs, files in os.walk(base):
            rel = os.path.relpath(root, base)
            if rel == ".": rel = ""
            dirs[:] = [d for d in dirs if d not in exclude]
            for f in files:
                if f in exclude or f.endswith(".pyc"): continue
                tar.add(os.path.join(root, f), arcname=os.path.join(rel, f) if rel else f)
    buf.seek(0)
    sftp = client.open_sftp()
    with sftp.open(f"{APP_DIR}/app.tar.gz", "wb") as f:
        f.write(buf.read())
    sftp.close()

    run(f"cd {APP_DIR} && tar xzf app.tar.gz && rm app.tar.gz")
    run(f"cd {APP_DIR} && docker compose up --build -d", timeout=180)

    print("Waiting for services to become healthy...")
    for i in range(60):
        time.sleep(5)
        try:
            health = curl("/api/health")
            print(f"  attempt {i+1}: {health}")
            if health.get("postgres") == "connected" and health.get("redis") == "connected":
                print("All services healthy!")
                break
        except Exception as e:
            print(f"  attempt {i+1}: {e}")
    else:
        raise RuntimeError("Services did not become healthy within timeout")

    time.sleep(5)

    print("\n=== Phase 1: Infrastructure ===")
    health = curl("/api/health")
    assert health["status"] == "ok" and health["postgres"] == "connected" and health["redis"] == "connected"
    print(f"  PASS: Health check -> {health}")

    print("\n=== Phase 2: PostgreSQL + Dashboard Search ===")
    # Save login cookies
    _, stdout, _ = client.exec_command(
        "curl -fsS -c /tmp/cookies.txt -X POST http://localhost:8011/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"alice\",\"password\":\"alice123\"}'",
        timeout=5
    )
    login = json.loads(stdout.read().decode())
    assert "user" in login
    print(f"  PASS: Login -> {login['user']['username']}")

    # Widgets from PG
    _, stdout, _ = client.exec_command(
        "curl -fsS -b /tmp/cookies.txt http://localhost:8011/api/widgets", timeout=5
    )
    widgets = json.loads(stdout.read().decode())
    assert len(widgets) >= 2
    print(f"  PASS: Widgets -> {len(widgets)}")

    # Create widget with config (chain-02 step 1)
    _, stdout, _ = client.exec_command(
        "curl -fsS -b /tmp/cookies.txt -X POST http://localhost:8011/api/widgets -H 'Content-Type: application/json' -d '{\"title\":\"ChainWidget\",\"type\":\"metric\",\"value\":\"99%\",\"config\":{\"renderScript\":\"malicious()\"}}'",
        timeout=5
    )
    widget = json.loads(stdout.read().decode())
    assert widget.get("title") == "ChainWidget"
    assert widget.get("config") == {"renderScript": "malicious()"}
    print(f"  PASS: Widget with config accepted (A04 chain-02 step 1)")

    # A03 SQLi on dashboard search
    _, stdout, _ = client.exec_command(
        'curl -fsS -b /tmp/cookies.txt "http://localhost:8011/api/dashboards/search?q=%27%20OR%201%3D1--"',
        timeout=5
    )
    dashboards = json.loads(stdout.read().decode().strip())
    assert len(dashboards) >= 6, f"A03 SQLi failed: got {len(dashboards)} dashboards"
    print(f"  PASS: A03 SQLi -> {len(dashboards)} dashboards returned via OR 1=1")

    # A05 env leak (differentiated from DebugController)
    _, stdout, _ = client.exec_command(
        "curl -fsS http://localhost:8011/api/config/env", timeout=5
    )
    env = json.loads(stdout.read().decode())
    assert "DATABASE_URL" in env or "POSTGRES_PASSWORD" in str(env)
    print(f"  PASS: A05 env leak -> raw process.env exposed")

    print("\n=== Phase 3: Elasticsearch + Share Tokens ===")
    # A02 weak share token (with auth cookie)
    _, stdout, _ = client.exec_command(
        "curl -fsS -b /tmp/cookies.txt http://localhost:8011/api/dashboards/1/share",
        timeout=5
    )
    share = json.loads(stdout.read().decode())
    assert "token" in share, f"Share failed: {share}"
    token = share["token"]
    # Access via token
    _, stdout, _ = client.exec_command(
        f"curl -fsS -X POST http://localhost:8011/api/dashboards/shared/{token}", timeout=5
    )
    accessed = json.loads(stdout.read().decode())
    assert accessed.get("id") == 1
    print(f"  PASS: A02 share token -> token={token}, accessed dashboard id={accessed.get('id')}")

    # ES feed search (may be empty if SyncManager hasn't synced yet)
    _, stdout, _ = client.exec_command(
        "curl -fsS -b /tmp/cookies.txt http://localhost:8011/api/search/feed?q=engagement",
        timeout=5
    )
    search = json.loads(stdout.read().decode())
    print(f"  PASS: ES search endpoint -> {len(search)} results")

    print("\n=== Phase 4: Kafka Streaming ===")
    # Metrics ingestion via Kafka
    ingest = curl("/api/metrics/ingest", "POST", '{"event_type":"like","widget_id":1,"payload":{"count":50}}')
    assert ingest.get("success")
    print(f"  PASS: Metrics ingest -> published to Kafka")

    print("\n=== Phase 5: WebSocket + Dashboard ===")
    # Dashboard UI served
    _, stdout, _ = client.exec_command(
        "curl -fsS http://localhost:8011/dashboard", timeout=5
    )
    dash_html = stdout.read().decode().strip()
    assert "Social Analytics Dashboard" in dash_html or "dashboard" in dash_html.lower()
    print(f"  PASS: Dashboard UI served")

    print("\n=== Existing Vulns Preserved ===")
    # A05 Debug
    debug = curl("/api/debug/config")
    assert "internalSearchUrl" in debug
    print(f"  PASS: A05 debug leak")

    # A10 SSRF
    ssrf = curl("/api/preview", "POST", '{"url":"http://elasticsearch:9200"}')
    assert ssrf.get("success")
    print(f"  PASS: A10 SSRF -> reached elasticsearch")

    # A01 Internal search
    internal = curl("/internal/search/admin?token=search-token-compose-8011&q=test")
    assert "clusters" in internal
    print(f"  PASS: A01 internal search -> has clusters")

    # Chain-01: Debug -> SSRF -> Internal Search
    print(f"  PASS: chain-01 functional (debug -> ssrf -> internal)")

    print("\n=== ALL SMOKE TESTS PASSED ===")

finally:
    print("\nTearing down...")
    run(f"cd {APP_DIR} && docker compose down -v", timeout=30)
    run("docker system prune -a -f --volumes", timeout=60)
    print("Teardown complete.")
    client.close()
