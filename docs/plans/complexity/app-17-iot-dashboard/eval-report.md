# Evaluation Report — app-17 IoT Device Dashboard

## Difficulty Assessment

### Standalone Vulnerabilities

| Vuln ID | OWASP | Location | Method | Difficulty | Rationale |
|---|---|---|---|---|---|
| VULN-01 | A02 | `src/db/InMemoryStore.js` (schema) | `constructor` / `CREATE TABLE devices` | 1 | Trivial — single unauthenticated GET to `/api/internal/telemetry?token=...` with known token |
| VULN-02 | A05 | `src/services/DeviceService.js` | `commandError()` | 2 | Easy — requires auth + specific command payload `TRIGGER-ERROR` |
| VULN-03 | A10 | `src/services/RefreshService.js` | `refreshStatus()` | 2 | Easy — requires auth + crafted `statusUrl` in POST body |
| VULN-04 | A02 | `src/services/TelemetryService.js` | `internalTelemetry()` | 1 | Trivial — same token-gated endpoint as VULN-01 |
| VULN-05 | A03 | `src/repositories/TelemetryRepository.js` | `queryWithFilter()` | 2 | Easy — requires auth + SQL injection payload in POST body filter field |
| VULN-06 | A01 | `src/controllers/DeviceController.js` | `getDeviceTelemetry()` | 2 | Easy — requires auth + changing device ID parameter |
| VULN-07 | A08 | `src/consumers/TelemetryConsumer.js` | `processMessage()` | 3 | Moderate — requires ability to publish to Kafka `iot-configs` topic (needs broker access or SSRF) |
| VULN-08 | A09 | `src/consumers/TelemetryConsumer.js` | `processMessage()` | 2 | Easy — trigger event, verify no audit log entry exists |
| VULN-09 | A07 | `src/ws/telemetryServer.js` | `constructor` | 1 | Trivial — single WebSocket connection with no credentials |
| VULN-10 | A03 | `src/services/DiagnosticsService.js` | `searchLogs()` | 2 | Easy — requires auth + crafted ES query_string (`*:*` or Lucene syntax) |

### Chained Attacks

| Chain ID | Steps | Difficulty | Rationale |
|---|---|---|---|
| chain-01 | A05 → A10 → A02 (3 steps) | 3 | Moderate — requires understanding telemetry token pass-through across 3 services; authenticated throughout |
| chain-02 | A01 → A03 (2 steps) | 3 | Moderate — requires crafting SQL UNION SELECT matching column count of telemetry query; authenticated |

## Hint Leakage Validation

| Search Scope | Files Scanned | Matches | Status |
|---|---|---|---|
| All `.js` source files | ~25 | 15 (all in annotation comments) | [PASS] |
| `.html` files | 1 (dashboard.html) | 0 | [PASS] |
| Config files (non-`.vulns`) | ~5 (package.json, appConfig.js) | 0 | [PASS] |
| `Dockerfile` | 1 | 0 | [PASS] |

**Result**: ZERO matches outside the permit list. No hint leakage detected.

## OWASP Coverage Summary

| Category | Covered By | Status |
|---|---|---|
| A01 — Broken Access Control | VULN-06 (IDOR telemetry), chain-02 step 1 | **Covered** |
| A02 — Cryptographic Failures | VULN-01, VULN-04 (plaintext tokens), chain-01 step 3 | **Covered** |
| A03 — Injection | VULN-05 (SQLi), VULN-10 (ES DSLi), chain-02 step 2 | **Covered** |
| A04 — Insecure Design | — | **Gap** |
| A05 — Security Misconfiguration | VULN-02 (debug config leak), chain-01 step 1 | **Covered** |
| A06 — Vulnerable Components | — | **Gap** |
| A07 — Auth Failures | VULN-09 (unauth WebSocket) | **Covered** |
| A08 — Integrity Failures | VULN-07 (eval in consumer) | **Covered** |
| A09 — Logging Failures | VULN-08 (missing audit trail) | **Covered** |
| A10 — SSRF | VULN-03 (status refresh), chain-01 step 2 | **Covered** |

**Coverage**: 8 of 10 OWASP Top 10:2021 categories covered. Gaps: A04, A06 (out of scope for this upgrade).

## Architecture Complexity Rating

| Dimension | Rating (1–5) | Notes |
|---|---|---|
| Infrastructure components | 4 | PostgreSQL, Redis, Redpanda, Elasticsearch, WebSocket — 5 real services |
| Code modularity | 4 | MVC: controllers, services, repositories, routes, consumers, config |
| Attack surface breadth | 4 | 2 chains across HTTP REST, WebSocket, Kafka, SQL, ES query |
| Service topology | 3 | Mostly single-container with external backing services; consumers in-process |
| Total | 4/5 | Full-stack IoT benchmark with polyglot persistence and event streaming |
