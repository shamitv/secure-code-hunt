# Phase 04 TODO — Verification + Metadata Sync + Eval Report

## Pre-requisites

- [ ] Phase 1, 2, and 3 complete and verified
- [ ] Read `vuln-inventory.md` — final no-touch reference check
- [ ] Docker Compose environment ready for smoke test

## Severity Fix

- [ ] Open `.vulns` — locate standalone A10 entry (`src/services/RefreshService.js`, `refreshStatus`)
- [ ] Change `"severity": "high"` to `"severity": "medium"`
- [ ] Verify chain-01 step 2 already has `"severity": "medium"` — no change needed

## Standalone Vulnerability Exploitability Tests

- [ ] VULN-01 (A02): `GET /api/internal/telemetry?token=INTERNAL-SECRET-TELEMETRY-TOKEN-2026` → returns `deviceSecret` fields
- [ ] VULN-02 (A05): Auth → `POST /api/devices/command {"deviceId":1,"command":"TRIGGER-ERROR"}` → leaks telemetryUrl + telemetryToken
- [ ] VULN-03 (A10): Auth → `POST /api/devices/refresh {"statusUrl":"http://web:8017/api/internal/telemetry?token=..."}` → SSRF returns device keys
- [ ] VULN-04 (A02): Same as VULN-01 — verify via internal telemetry
- [ ] VULN-05 (A03): Auth → `POST /api/devices/1/telemetry/query {"filter":"1 UNION SELECT username,password_hash FROM users--"}` → returns user data
- [ ] VULN-06 (A01): Auth as alice → `GET /api/devices/2/telemetry` → returns device 2 telemetry (no ownership check)
- [ ] VULN-07 (A08): Publish to Kafka `iot-configs` with `{"device_id":1,"ruleScript":"..."}` → consumer executes eval()
- [ ] VULN-08 (A09): Process event through consumer → verify no audit log entry created
- [ ] VULN-09 (A07): `ws://localhost:8017/ws/telemetry` → connects without token → receives telemetry broadcasts
- [ ] VULN-10 (A03): Auth → `GET /api/diagnostics/search?q=*:*` → raw query_string returns all ES logs

## Chain Exploitability Tests

### chain-01: Debug Config Leak → SSRF → Plaintext Tokens → Lateral Movement
- [ ] Step 1: Auth → trigger command error → extract `telemetry_server_url` and `telemetry_access_key`
- [ ] Step 2: Auth → SSRF to extracted telemetry URL + token
- [ ] Step 3: Server returns all device records with plaintext `deviceSecret` values
- [ ] Verify attacker obtains: `IOT-DEV-KEY-THERMO-1122`, `IOT-DEV-KEY-GATEWAY-8877`
- [ ] Combined impact confirmed: lateral_movement

### chain-02: IDOR Telemetry → SQL Injection → db_exfiltration
- [ ] Step 1: Auth → `GET /api/devices/2/telemetry` → returns telemetry for device 2 without ownership verification
- [ ] Step 2: Auth → `POST /api/devices/1/telemetry/query {"filter":"1 UNION SELECT id,username,password_hash FROM users"}` → returns user table data
- [ ] Combined impact confirmed: db_exfiltration

## Annotation Verification

- [ ] Run: `rg -n "VULNERABILITY" apps/javascript/app-17-iot-dashboard/src -g "*.js"`
- [ ] Confirm 10 standalone VULNERABILITY annotations found
- [ ] Run: `rg -n "CHAIN LINK" apps/javascript/app-17-iot-dashboard/src -g "*.js"`
- [ ] Confirm 5 CHAIN LINK annotations found (3 for chain-01, 2 for chain-02)
- [ ] Cross-check each annotation text against `.vulns` description field
- [ ] Fix any mismatches

## Decoy Verification

- [ ] List all decoys from `.vulns.decoys[]`
- [ ] Verify each decoy code path exists in source
- [ ] Verify each decoy is positioned in same file or adjacent directory as corresponding vulnerability
- [ ] Run functional test on each decoy to confirm it's actually safe (parameterized, validated, etc.)
- [ ] Add any missing decoys to `.vulns.decoys[]`

## Metadata Cross-Reference

- [ ] `.vulns.vulnerabilities[].length` = 10
- [ ] `.vulns.chained_attacks[].length` = 2
- [ ] `.vulns.decoys[].length` matches actual count
- [ ] `README.md` chain section includes both chains with complete tables + narratives
- [ ] `README.md` API endpoint table includes all endpoints (existing + new)
- [ ] `scenarios.md` includes both chains with step-by-step instructions
- [ ] All `.vulns` locations point to existing files and methods
- [ ] All `.vulns` severities match source annotation context
- [ ] All `.vulns` CWE IDs are valid
- [ ] No stale locations from pre-migration (e.g., `InMemoryStore.js` → updated to `PgDeviceRepository.js`)

## Hint Leakage Validation

- [ ] Run keyword scan for JavaScript source files:
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" `
    apps/javascript/app-17-iot-dashboard `
    -g "*.js" `
    -g "!**/.vulns" `
    -g "!**/README.md" `
    -g "!**/scenarios.md" `
    -g "!docs/plans/complexity/**"
  ```
- [ ] Manually review each match — confirm it's inside a `// VULNERABILITY`, `// CHAIN LINK`, or `// DECOY` comment
- [ ] If any match is outside an annotation comment: fix by adding annotation or removing the keyword
- [ ] Run keyword scan for other file types:
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" `
    apps/javascript/app-17-iot-dashboard `
    -g "*.{html,json,yml,yaml,Dockerfile}" `
    -g "!**/.vulns" `
    -g "!**/README.md" `
    -g "!**/scenarios.md" `
    -g "!**/docker-compose.yml" `
    -g "!docs/plans/complexity/**"
  ```
- [ ] Verify zero matches outside permit list

## Eval Report

- [ ] Create `eval-report.md` in `docs/plans/complexity/app-17-iot-dashboard/`

### Difficulty Assessment Table

Rate each vulnerability and chain 1–5 using the generic guide criteria:

| Rating | Label | Criteria |
|---|---|---|
| 1 | Trivial | Single HTTP request, no auth needed |
| 2 | Easy | Requires authentication or simple parameter manipulation |
| 3 | Moderate | Requires understanding service topology or multi-step request |
| 4 | Hard | Requires cross-service exploitation or custom tooling |
| 5 | Expert | Requires chaining 3+ steps across services with specialized payloads |

### Evaluate each standalone vulnerability:

| Vuln ID | OWASP | Location | Difficulty | Rationale |
|---|---|---|---|---|
| VULN-01 | A02 | `src/repositories/PgDeviceRepository.js` → `findAll()` | 1 | Single unauthenticated GET with known token |
| VULN-02 | A05 | `src/services/DeviceService.js` → `commandError()` | 2 | Requires auth + specific command payload (`TRIGGER-ERROR`) |
| VULN-03 | A10 | `src/services/RefreshService.js` → `refreshStatus()` | 2 | Requires auth + crafted statusUrl in POST body |
| VULN-04 | A02 | `src/services/TelemetryService.js` → `internalTelemetry()` | 1 | Single unauthenticated GET with known token (same as VULN-01) |
| VULN-05 | A03 | `src/services/TelemetryQueryService.js` → `queryDeviceTelemetry()` | 2 | Requires auth + SQL injection payload in POST body filter field |
| VULN-06 | A01 | `src/controllers/DeviceController.js` → `getDeviceTelemetry()` | 2 | Requires auth + changing device ID parameter |
| VULN-07 | A08 | `src/consumers/TelemetryConsumer.js` → `processMessage()` | 3 | Requires ability to publish to Kafka topic (moderate — needs broker access or SSRF to internal broker) |
| VULN-08 | A09 | `src/consumers/TelemetryConsumer.js` → `processMessage()` | 2 | Requires triggering an event + checking audit logs (negative test) |
| VULN-09 | A07 | `src/ws/telemetryServer.js` → `constructor` | 1 | Single WebSocket connection with no credentials |
| VULN-10 | A03 | `src/services/DiagnosticsService.js` → `searchLogs()` | 2 | Requires auth + crafted ES query string |

### Evaluate each chain:

| Chain | Steps | Difficulty | Rationale |
|---|---|---|---|
| chain-01 | A05 → A10 → A02 (3 steps) | 3 | Requires understanding the telemetry token pass-through (extract from error → feed to SSRF); authenticated |
| chain-02 | A01 → A03 (2 steps) | 3 | Requires crafting SQL UNION SELECT that matches column count of telemetry query; authenticated |

### Hint Leakage Results Table

| Search Scope | Files Scanned | Matches | Status |
|---|---|---|---|
| All `.js` source files | ~25 | All in annotation comments | [PASS] |
| `.html` files | 1 | 0 | [PASS] |
| Config files (non-`.vulns`) | ~5 | 0 | [PASS] |
| `Dockerfile` | 1 | 0 | [PASS] |

**Result**: Insert final result after validation.

### OWASP Coverage Summary

| Category | Covered? | Vuln/Chain |
|---|---|---|
| A01 — BAC | Yes | VULN-06 (IDOR telemetry), chain-02 step 1 |
| A02 — Crypto Failures | Yes | VULN-01, VULN-04, chain-01 step 3 |
| A03 — Injection | Yes | VULN-05 (SQLi), VULN-10 (ES DSLi), chain-02 step 2 |
| A04 — Insecure Design | No | — |
| A05 — Security Misconfig | Yes | VULN-02, chain-01 step 1 |
| A06 — Vulnerable Components | No | — |
| A07 — Auth Failures | Yes | VULN-09 (WS) |
| A08 — Integrity Failures | Yes | VULN-07 (eval) |
| A09 — Logging Failures | Yes | VULN-08 (missing audit) |
| A10 — SSRF | Yes | VULN-03, chain-01 step 2 |

**OWASP coverage**: 8/10 categories. Gaps: A04, A06.

## Docker Compose Smoke Test

- [ ] Navigate to `apps/javascript/app-17-iot-dashboard/`
- [ ] Run: `docker compose up --build -d`
- [ ] Wait for all 6 services (web, postgres, redis, kafka, elasticsearch) to report `healthy`
  ```powershell
  docker compose ps
  ```
- [ ] Health check: `curl http://localhost:8017/api/health` → `{"status":"ok"}`
- [ ] Register user: `curl -X POST http://localhost:8017/api/auth/register -H "Content-Type: application/json" -d '{"username":"testuser","password":"test123"}'`
- [ ] Login: `curl -v -X POST http://localhost:8017/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice_owner","password":"alice123"}'` → extract `Set-Cookie` header
- [ ] Authenticated endpoint: `curl http://localhost:8017/api/devices/1 -H "Cookie: session_id=<value>"` → returns device detail
- [ ] Dashboard: `curl http://localhost:8017/dashboard` → returns HTML (200)
- [ ] WS upgrade request: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8017/ws/telemetry` → 101 Switching Protocols
- [ ] Tear-down:
  ```powershell
  docker compose down -v
  docker system prune -a -f --volumes
  ```

## Contract Test

- [ ] Review `tests/contract.test.js` — update assertions if needed for new endpoints/files
- [ ] Run: `node tests/contract.test.js`
- [ ] All assertions pass

## Final Metadata Pass

- [ ] `.vulns` has zero stale references (all files/methods exist)
- [ ] `README.md` follows all AGENTS.md template sections (Overview, Business Domain, Tech Stack, Features, Security Benchmarking, Chained Scenario, API Endpoints, Running Locally, Running via Docker)
- [ ] `scenarios.md` has explicit header: "Supplemental notes only. Ground truth is in .vulns and README.md."
- [ ] No TODO comments left in source files
- [ ] No debug `console.log` statements left in production code paths

## Regular Commits

- [ ] Commit after severity fix: `git add -A && git commit -m "app-17 phase-04: fix A10 severity high→medium in .vulns"`
- [ ] Commit after exploitability tests: `git add -A && git commit -m "app-17 phase-04: exploitability verified — all vulns + chains functional"`
- [ ] Commit after metadata sync: `git add -A && git commit -m "app-17 phase-04: metadata sync — .vulns, README, scenarios.md cross-referenced"`
- [ ] Commit after eval report: `git add -A && git commit -m "app-17 phase-04: eval-report.md with difficulty ratings + hint leakage validation"`
- [ ] Push to remote after each commit

## Phase Status Report

- [ ] Create `phase-04/status-report.md` after completion:
  - Summary of verification results
  - Exploitability test results (pass/fail per vuln, per chain)
  - Hint leakage pass/fail
  - Docker Compose smoke test pass/fail
  - Contract test pass/fail
  - Final OWASP coverage
  - Blockers (if any)

## Completion Criteria

- [ ] All 10 standalone vulnerabilities exploitable
- [ ] Both chains (chain-01, chain-02) exploitable end-to-end
- [ ] All 5 CHAIN LINK annotations present
- [ ] All 10 VULNERABILITY annotations present
- [ ] All decoys present and functionally safe
- [ ] Zero hint leakage outside permit list
- [ ] `.vulns` ↔ `README.md` ↔ `scenarios.md` ↔ source annotations in agreement
- [ ] Docker Compose smoke test passes
- [ ] Contract test passes
- [ ] `eval-report.md` complete
- [ ] No lingering resources on VM after tear-down
