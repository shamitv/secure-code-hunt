# Phase 06 TODO — Verification + Metadata Synchronization

## Pre-requisites
- [ ] Phase 05 complete and verified
- [ ] Read `vuln-inventory.md` — confirm all no-touch files still intact
- [ ] Docker Compose running with all 6 services healthy (web, postgres, redis, kafka, elasticsearch)

---

## 1. Standalone Vulnerability Exploitability Audit

For each of the 11 standalone vulnerabilities, confirm exploitability in Docker Compose:

### VULN-01 (A10 SSRF — PreviewService)
- [ ] `POST /api/preview` with `{ url: "http://redis:6379" }` -> response contains Redis protocol data or connection rejection message
- [ ] `POST /api/preview` with `{ url: "http://elasticsearch:9200" }` -> response contains ES cluster info
- [ ] `POST /api/preview` with `{ url: "http://kafka:9092" }` -> confirms internal service reachability

### VULN-02 (A05 Debug — DebugController)
- [ ] `GET /api/debug/config` -> returns `internalSearchUrl`, `internalSearchToken`, `databaseUrl`, etc.
- [ ] No authentication required — works without cookie

### VULN-03 (A01 Access Control — InternalSearchService)
- [ ] `GET /internal/search/admin?token=search-token-compose-8011&q=test` -> returns service topology JSON
- [ ] `GET /internal/search/admin?token=wrong` -> returns empty/error (token-only check, no session)

### VULN-04 (A03 XSS — public/js/app.js)
- [ ] Create widget with title `<img src=x onerror=alert(1)>` via API
- [ ] Load dashboard page -> widget title renders unsafely via `innerHTML`

### VULN-05 (A05 Hardcoded Key — public/js/app.js)
- [ ] Inspect `public/js/app.js` source or `/` page source -> contains `rpt_live_*` key
- [ ] Confirm the key string is visible client-side

### VULN-06 (A03 SQLi — DashboardRepository)
- [ ] `GET /api/dashboards/search?q=' OR 1=1--` -> returns all dashboards (SQLi confirmed)
- [ ] `GET /api/dashboards/search?q=Q1' UNION SELECT 1,'test','sqli','{}'::json,now()--` -> injected row in results

### VULN-07 (A05 Env Leak — ConfigController)
- [ ] `GET /api/config/env` -> returns raw `process.env` including `POSTGRES_PASSWORD=socialpass`, `REDIS_URL`, `KAFKA_BROKERS`
- [ ] No authentication required

### VULN-08 (A02 Weak Crypto — ShareService)
- [ ] `GET /api/dashboards/1/share` -> returns token `Tg==` (XOR of 1 and 0x4F = 78 = 'N', base64)
- [ ] Craft token for dashboard 2: `Buffer.from(String(2 ^ 0x4F)).toString('base64')` -> `TQ==`
- [ ] `POST /api/dashboards/shared/TQ==` -> returns dashboard 2 data without owning it

### VULN-09 (A08 Deserialization — AnalyticsEventConsumer)
- [ ] `POST /api/metrics/ingest` with `{ event_type: "comment", widget_id: 1, payload: "process.exit(1)" }` -> consumer eval()s payload (app stays up? confirms the code path)
- [ ] `POST /api/metrics/ingest` with `{ event_type: "comment", widget_id: 1, payload: { __proto__: { isAdmin: true } } }` -> prototype pollution via Object.assign if implemented

### VULN-10 (A07 Weak WS Auth — WebSocket)
- [ ] Connect to `ws://localhost:8011/ws/live` without any cookie or token -> connection accepted
- [ ] Publish metrics via `POST /api/metrics/ingest` -> unauthenticated WS client receives the data
- [ ] `GET /api/widgets` without valid session -> returns error (decoy confirms auth gap)

### VULN-11 (A04 Insecure Design — Widget Config)
- [ ] `POST /api/widgets` with `{ title: "X", type: "metric", value: "1", config: { renderScript: "alert(1)", evilKey: true } }` -> 200, config accepted as-is
- [ ] `POST /api/widgets` to update (via updateWidget decoy) -> extra config keys stripped (decoy confirms)

---

## 2. Chain Scenario Exploitability Audit

### chain-01: Debug Config Leak -> HTTP SSRF -> Internal Search Pivot -> lateral_movement
- [ ] Step 1: `GET /api/debug/config` -> extract `internalSearchUrl` and `internalSearchToken`
- [ ] Step 2: `POST /api/preview` with `{ url: "<internalSearchUrl>?token=<internalSearchToken>&q=test" }` -> SSRF fetches internal endpoint
- [ ] Step 3: Response contains `clusters: ["campaign-index", "influencer-index", "billing-export-index"]` and `nextHop: "http://search-admin.internal:9200/_cat/indices"` (service topology exposure)
- [ ] Combined: Attacker discovers internal service layout via 3-hop chain
- [ ] Impact: `lateral_movement` confirmed

### chain-02: Widget Config Poison -> Weak Share Token -> data_modification
- [ ] Step 1: `POST /api/widgets` as alice with `{ title: "Poison", type: "metric", value: "1", config: { renderScript: "document.title='PWNED'" } }` -> widget created
- [ ] Step 2: Alice shares dashboard: `GET /api/dashboards/<alice_dashboard>/share` -> token generated
- [ ] Step 3: Bob (attacker) guesses alice's dashboard ID, crafts token: `POST /api/dashboards/shared/<crafted_token>` -> accesses alice's dashboard
- [ ] Step 4: Bob creates his own widget with data-modifying payload on alice's dashboard
- [ ] Impact: `data_modification` confirmed

---

## 3. Decoy Pattern Audit

- [ ] Verify each decoy listed in `.vulns.decoys` is present in source and functional:
  - DECOY-01: `referenceGuards.ts` allowedCallback — hostname allowlist validation
  - DECOY-02: `SessionCache.ts` — `crypto.randomBytes` for session IDs
  - DECOY-03: `UserRepository.findByUsername()` — parameterized `$1`
  - DECOY-04: `DashboardRepository.findByUserId()` — parameterized `$1`
  - DECOY-05: `AnalyticsRepository.insertEvent()` — parameterized `$1, $2, $3`
  - DECOY-06: `ShareService.generateShareLink()` — `crypto.randomBytes(32)`
  - DECOY-07: `SocialSearchController.searchByUser()` — parameterized ES term query
  - DECOY-08: `MetricsController.ingest()` — JSON Schema validation before publish
  - DECOY-09: `WidgetController.updateWidget()` — config whitelist
  - DECOY-10: `WidgetController` REST endpoints — cookie-based auth check

---

## 4. No-Touch File Integrity

- [ ] Confirm no annotation-bearing file was modified during upgrade:
  - [ ] `src/controllers/DebugController.ts` — annotations intact
  - [ ] `src/services/PreviewService.ts` — annotations intact
  - [ ] `src/services/InternalSearchService.ts` — annotations intact
  - [ ] `src/referenceGuards.ts` — decoy code intact
  - [ ] `src/cache/SessionCache.ts` — decoy code intact
  - [ ] `public/js/app.js` — XSS + hardcoded key intact

---

## 5. Metadata Synchronization

### .vulns File
- [ ] Verify all 11 standalone vulnerabilities listed in `vulnerabilities` array
- [ ] Verify each has: `owasp_id`, `category`, `location`, `method`, `description`, `severity`, `cwe`
- [ ] Verify both chains in `chained_attacks` array with all components
- [ ] Verify all 10 decoys in `decoys` array
- [ ] Cross-check: every `// VULNERABILITY` annotation in source has corresponding `.vulns` entry
- [ ] Cross-check: every `// CHAIN LINK` annotation has corresponding chain component entry

### README.md
- [ ] Complete API endpoint table — all 18+ endpoints listed
- [ ] Complete chained vulnerability scenario section for BOTH chains
- [ ] Both chain tables have: step, issue, severity, OWASP, location columns
- [ ] Attack narrative + combined impact for each chain
- [ ] Features list includes enterprise dashboard

### scenarios.md
- [ ] chain-01 narrative complete
- [ ] chain-02 narrative complete with step-by-step attacker flow

---

## 6. Hint Leakage Validation

Search all source files for benchmark keywords outside permitted locations.

### Permitted Locations (no flag)
- Source annotation comments (`// VULNERABILITY`, `// CHAIN LINK`)
- `.vulns` JSON file
- `README.md` (dedicated chain section)
- `scenarios.md`
- Files under `docs/plans/complexity/`

### Search Execution
- [ ] Search `.ts` files (excluding permit-list):
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.ts" -g "!**/.vulns" -g "!**/README.md" -g "!**/scenarios.md" -g "!docs/plans/complexity/**"
  ```
- [ ] Search `.js` and `.html` files:
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.{js,html}" -g "!docs/plans/complexity/**"
  ```
- [ ] Search `.sql`, `.json` files:
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.{sql,json}" -g "!**/.vulns" -g "!**/package.json"
  ```
- [ ] Search `Dockerfile`, `docker-compose.yml`:
  ```powershell
  rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics/Dockerfile apps/typescript/app-11-social-analytics/docker-compose.yml
  ```

### Expected Result
- ZERO matches outside permitted locations
- Any match found = hint leakage -> must be removed

---

## 7. Difficulty Rating Assessment

Rate each vulnerability on 1--5 scale and record in `eval-report.md`:

| Rating | Label | Criteria |
|--------|-------|----------|
| 1 | Trivial | Single HTTP request, no auth needed |
| 2 | Easy | Requires authentication or simple parameter manipulation |
| 3 | Moderate | Requires understanding service topology or multi-step request |
| 4 | Hard | Requires cross-service exploitation or custom tooling |
| 5 | Expert | Requires chaining 3+ steps across services with specialized payloads |

Proposed ratings (to be confirmed during audit):

| ID | OWASP | Difficulty | Rationale |
|----|-------|------------|-----------|
| VULN-01 | A10 | 1 | Single POST with `url` field, no auth |
| VULN-02 | A05 | 1 | Single GET, no auth |
| VULN-03 | A01 | 2 | Token leaked from VULN-02, craft URL |
| VULN-04 | A03 (XSS) | 2 | Create widget, view dashboard |
| VULN-05 | A05 (key) | 1 | View page source |
| VULN-06 | A03 (SQLi) | 1 | Single GET with `q` param, no auth needed for search endpoint |
| VULN-07 | A05 (env) | 1 | Single GET, no auth |
| VULN-08 | A02 | 3 | Requires understanding XOR encoding, craft tokens for enumeration |
| VULN-09 | A08 | 3 | Craft Kafka message via REST then observe consumer-side eval |
| VULN-10 | A07 | 2 | Connect WS, no auth — but requires WS client |
| chain-01 | A05->A10->A01 | 3 | Three-step across debug, SSRF, internal search |
| chain-02 | A04->A02 | 4 | Craft malicious widget + enumerate share tokens + access victim dashboard |

---

## 8. Integration Test Suite

- [ ] Run `npm test` inside Docker container:
  ```bash
  docker compose exec web npm test
  ```
- [ ] All contract tests pass (endpoint responses, annotation presence)
- [ ] Add contract test assertions for new endpoints if missing

---

## 9. Generate eval-report.md

- [ ] Create `docs/plans/complexity/app-11-social-analytics/eval-report.md` with:
  - Difficulty Assessment table (from step 7 above)
  - Hint Leakage Validation results table (from step 6 above)
  - OWASP Coverage Summary: 8/10 categories (A01, A02, A03, A04, A05, A07, A08, A10)
  - Total vulnerabilities: 11 standalone, 2 chains, 10+ decoys

---

## 10. Docker Compose Tear-Down

- [ ] Stop containers: `docker compose down -v`
- [ ] Clean resources: `docker system prune -a -f --volumes`
- [ ] Confirm no lingering containers, images, volumes, or networks

---

## Regular Commits
- [ ] Commit after each major verification section:
  `git add -A && git commit -m "app-11 phase-06: <verification milestone>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-06/status-report.md` after completion:
  - Audit results per section
  - Files modified (count) — metadata-only
  - All vulns exploitable? (yes/no)
  - All chains functional? (yes/no)
  - All decoys present? (yes/no)
  - Hint leakage found? (yes/no — expected 0)
  - Tests passing? (yes/no)
  - Blockers
