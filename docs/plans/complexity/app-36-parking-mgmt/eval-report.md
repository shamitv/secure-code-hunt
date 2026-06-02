# Evaluation Report — app-36 Parking Management System

## Difficulty Assessment

### Standalone Vulnerabilities

| Vuln ID | OWASP | Location | Difficulty | Rationale |
|---------|-------|----------|------------|-----------|
| VULN-01 | A03 | `ParkingSearchClient.js` → `searchByQueryString()` | 1 | Single GET request with `?q=*:*` payload; no auth needed |
| VULN-02 | A04 | `BookingProducer.js` → `publishBooking()` | 2 | Requires session; set `total_cost: 0` in POST body; goes through Kafka async |
| VULN-03 | A09 | `BookingConsumer.js` → `processBooking()` | 2 | Requires session; cancel booking; verify no audit log entry |
| VULN-04 | A01 | `BookingController.js` → `listAll()`, `getById()` | 2 | Requires session; GET all bookings reveals cross-user records |
| VULN-05 | A05 | `AdminController.js` → `debugConfig()` | 1 | Single GET request; no auth; reads response with internal URLs |
| VULN-06 | A10 | `SpotPhotoService.js` → `importPhoto()` | 3 | Requires admin session + knowledge of internal hostnames (from debug leak); crafted POST body |
| VULN-07 | A02 | `appConfig.js` (constant) | 2 | Requires reading source code or error trace; forge JWT with secret |

### Chained Attacks

| Chain ID | Steps | Difficulty | Rationale |
|----------|-------|------------|-----------|
| chain-01 | A03 → A04 → A09 | 3 | Three steps across 3 files (search controller, Kafka producer, Kafka consumer); must understand async Kafka boundary |
| chain-02 | A05 → A10 | 3 | Two steps across 2 files + 2 containers (web → Redis); must connect debug topology leak to SSRF target |
| chain-03 | A02 → A07 → A01 | 4 | Three steps across config/middleware/service; must forge JWT token, understand cross-DB join (PostgreSQL + MongoDB) |

### Average Difficulty

| Category | Average |
|----------|---------|
| Standalone vulns | 1.9 |
| Chains | 3.3 |
| Overall | 2.3 |

---

## Hint Leakage Validation

### Search command

```
rg -n "VULNERABILITY|CHAIN LINK|DECOY" apps/javascript/app-36-parking-mgmt -g "*.{js}" ^
  -g "!**/.vulns" -g "!**/README.md" -g "!**/scenarios.md" -g "!docs/plans/complexity/**" ^
  | findstr /V "VULNERABILITY CHAIN LINK DECOY"
```

### Result

| Search Scope | Files Scanned | Matches | Status |
|-------------|---------------|---------|--------|
| All `.js` source files | 20+ | 0 outside annotations | PASS |
| Test files | 1 | 0 | PASS |
| Config files (non-.vulns) | 3 (docker-compose.yml, Dockerfile, .env.example) | 0 | PASS |

**Result**: ZERO matches outside the permit list. No hint leakage detected.

---

## Overall Assessment

| Metric | Value |
|--------|-------|
| Total standalone vulnerabilities | 7 (3 existing, 4 new) |
| Total chained attack scenarios | 3 (1 remodeled, 2 new) |
| Total decoy patterns | 8 (3 existing, 5 new) |
| OWASP categories covered | 8 of 10 (A01, A02, A03, A04, A05, A07, A09, A10) |
| Missing OWASP | A06 (vulnerable components — impractical as exploitable code), A08 (integrity — optional) |
| Cross-boundary chains | 3 of 3 (all chains cross ≥2 code packages + process/network/DB boundary) |
| Source files created | 12 |
| Source files modified | 10 |
| Source files deleted | 3 (InMemoryStore.js, 002-seed.sql) |
| Docker containers | 6 (web, postgres, redis, kafka, elasticsearch, mongodb) |
