# Phase 04: Verification + Metadata Sync + Eval Report

## Goal

Validate exploitability of all vulnerabilities and chains. Synchronize all metadata artifacts
(`.vulns`, `README.md`, `scenarios.md`). Fix the A10 severity inconsistency. Run hint leakage
validation. Produce the `eval-report.md` with difficulty ratings. Perform Docker Compose
end-to-end smoke test.

## Scope

### Included

- [ ] Fix A10 standalone severity: `high` → `medium` in `.vulns`
- [ ] Exploitability test: all 6 standalone vulnerabilities (VULN-01 through VULN-06 from Phase 1-2, plus VULN-07 through VULN-10 from Phase 2-3)
- [ ] Exploitability test: chain-01 (all 3 steps, end-to-end)
- [ ] Exploitability test: chain-02 (all 2 steps, end-to-end)
- [ ] Verify all `// VULNERABILITY` annotations present in source
- [ ] Verify all `// CHAIN LINK` annotations present in source
- [ ] Verify all decoys present near vulnerable code
- [ ] Hint leakage validation (keyword scan per generic upgrade guide)
- [ ] Metadata cross-reference: `.vulns` ↔ `README.md` ↔ `scenarios.md` ↔ source annotations
- [ ] Create `eval-report.md` with difficulty ratings + hint leakage results
- [ ] Docker Compose integration test: `docker compose up --build` + healthcheck + smoke test
- [ ] Run `tests/contract.test.js` — update if needed for new endpoints

### Excluded

- New vulnerability planting (no new vulns in this phase)
- New chain creation
- Performance testing

## Verification Checklist

### Severity Fix

- [ ] In `.vulns`, locate the A10 standalone entry (`src/services/RefreshService.js`, `refreshStatus`)
- [ ] Change `"severity": "high"` to `"severity": "medium"`
- [ ] Verify chain-01 step 2 already has `"severity": "medium"` (consistent)

### Standalone Vulnerability Exploitability

| # | OWASP | Test | Expected Result |
|---|---|---|---|
| VULN-01 | A02 | `GET /api/internal/telemetry?token=INTERNAL-SECRET-TELEMETRY-TOKEN-2026` | Returns device records with `deviceSecret` fields in plaintext |
| VULN-02 | A05 | Auth → `POST /api/devices/command` with `{"deviceId":1,"command":"TRIGGER-ERROR"}` | Response includes `gateway_config.telemetry_server_url` and `telemetry_access_key` |
| VULN-03 | A10 | Auth → `POST /api/devices/refresh` with `{"statusUrl":"http://web:8017/api/internal/telemetry?token=..."}` | Server fetches internal telemetry and returns device keys |
| VULN-04 | A02 | `GET /api/internal/telemetry?token=INTERNAL-SECRET-TELEMETRY-TOKEN-2026` | Returns all devices with `deviceSecret` fields |
| VULN-05 | A03 | Auth → `POST /api/devices/1/telemetry/query` with `{"filter":"1 UNION SELECT username,password_hash FROM users--"}` | Returns user credentials from users table |
| VULN-06 | A01 | Auth as user A → `GET /api/devices/2/telemetry` (device owned by user B) | Returns telemetry for device 2 without ownership check |
| VULN-07 | A08 | Publish to Kafka `iot-configs` topic: `{"device_id":1,"ruleScript":"process.exit()"}` | Consumer executes `eval("process.exit()")` — verify via consumer crash or log output |
| VULN-08 | A09 | Process any telemetry/command event through consumer → check for audit log entry | No audit log entry found anywhere (console, ES, DB) |
| VULN-09 | A07 | Connect to `ws://localhost:8017/ws/telemetry` with no auth token | WebSocket connects and receives live telemetry data broadcasts |
| VULN-10 | A03 | Auth → `GET /api/diagnostics/search?q=*:*&pretty=true` | Returns all ES documents (raw query_string accepts Lucene syntax) |

### Chain Exploitability

#### chain-01: Debug Config Leak → SSRF → Plaintext Tokens → Lateral Movement

- [ ] Step 1: Auth → `POST /api/devices/command` with `TRIGGER-ERROR` → extract `telemetry_server_url` and `telemetry_access_key` from response
- [ ] Step 2: Auth → `POST /api/devices/refresh` with `{"statusUrl":"<telemetry_server_url>?token=<telemetry_access_key>"}` 
- [ ] Step 3: Server-side request to internal telemetry → returns device records with `deviceSecret` values
- [ ] Verify attacker obtains: `IOT-DEV-KEY-THERMO-1122`, `IOT-DEV-KEY-GATEWAY-8877`
- [ ] Combined impact verified: lateral_movement

#### chain-02: IDOR Telemetry → SQL Injection → db_exfiltration

- [ ] Step 1: Auth → `GET /api/devices/2/telemetry` → returns telemetry for device 2 (no ownership check)
- [ ] Step 2: Auth → `POST /api/devices/1/telemetry/query` with `{"filter":"1 UNION SELECT id, CAST(username AS numeric) FROM users--"}`
- [ ] Verify SQL injection returns user table data (username, password_hash)
- [ ] Combined impact verified: db_exfiltration

### Annotation Verification

- [ ] `rg -n "VULNERABILITY" apps/javascript/app-17-iot-dashboard/src -g "*.js"` — all 10 standalone vulns found
- [ ] `rg -n "CHAIN LINK" apps/javascript/app-17-iot-dashboard/src -g "*.js"` — all 5 chain links found (3 for chain-01, 2 for chain-02)
- [ ] No missing annotations
- [ ] All annotation text matches `.vulns` descriptions

### Decoy Verification

- [ ] All decoys listed in `.vulns.decoys[]` exist in source files
- [ ] Each decoy is positioned in same file or adjacent file as corresponding vulnerability
- [ ] Decoys are functionally safe (parameterized queries, schema validation, auth guards)

### Metadata Cross-Reference

- [ ] `.vulns.vulnerabilities[]` length matches standalone vuln count (10)
- [ ] `.vulns.chained_attacks[]` length = 2 (chain-01, chain-02)
- [ ] `.vulns.decoys[]` length matches actual decoy count
- [ ] `README.md` chain section has both chains with tables + narratives
- [ ] `README.md` API endpoint table lists all endpoints
- [ ] `scenarios.md` has both chains with exploitation instructions
- [ ] All locations in `.vulns` point to existing files and methods
- [ ] All severities in `.vulns` match source annotation context

### Hint Leakage Validation

Per the generic upgrade guide §7.2, search all source files for benchmark keywords outside permitted locations:

**Permitted locations**:
- Source annotation comments (`// VULNERABILITY`, `// CHAIN LINK`, `// DECOY`)
- `.vulns` JSON
- `README.md` chain section
- `scenarios.md`
- Files under `docs/plans/complexity/`

**Commands to run**:
```bash
# Search .js files only, excluding permit-list files
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" `
  apps/javascript/app-17-iot-dashboard `
  -g "*.js" `
  -g "!**/.vulns" `
  -g "!**/README.md" `
  -g "!**/scenarios.md" `
  -g "!docs/plans/complexity/**" `
  | Select-String -NotMatch "VULNERABILITY|CHAIN LINK|DECOY"
```

**Expected**: Zero matches outside annotation comments.

### Docker Compose Smoke Test

- [ ] Run `docker compose up --build -d` from app root
- [ ] Wait for all services to report `healthy`
- [ ] Run curl-based smoke tests:
  - [ ] `curl http://localhost:8017/api/health` → 200 OK
  - [ ] `curl -X POST http://localhost:8017/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice_owner","password":"alice123"}'` → returns session cookie
  - [ ] Use session cookie for authenticated tests
- [ ] Verify WebSocket connectivity: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8017/ws/telemetry`
- [ ] Verify dashboard accessibility: `curl http://localhost:8017/dashboard` → returns HTML
- [ ] Run `docker compose down -v`
- [ ] Run `docker system prune -a -f --volumes`

## Artifact Updates

- `.vulns`: Fix A10 severity; verify all entries accurate
- `README.md`: Final pass — ensure all sections complete per AGENTS.md template
- `scenarios.md`: Final pass
- `eval-report.md`: **Created in this phase** (see template below)

## eval-report.md Template

See [expansion-plan.md §eval-report] for the full template. Key sections:

1. **Difficulty Assessment** — rate each vulnerability and chain 1–5
2. **Hint Leakage Validation** — table of search scopes, matches, pass/fail
3. **Coverage Summary** — OWASP categories covered after upgrade

## Dependencies on Other Phases

- **Depends on**: Phase 1, Phase 2, Phase 3 — all infrastructure and vulnerabilities must be in place
- **No downstream dependencies** (this is the final phase)
