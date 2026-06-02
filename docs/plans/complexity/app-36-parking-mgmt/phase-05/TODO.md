# Phase 05 TODO — Verification + Evaluation

## Pre-requisites
- [ ] Phases 1-4 complete and verified at each phase boundary
- [ ] All 6 services healthy in Docker Compose
- [ ] All 7 vulnerabilities planted with annotations
- [ ] All 3 chains wired with annotations
- [ ] All 8 decoys present
- [ ] `.vulns`, `README.md`, `scenarios.md` updated through Phase 4
- [ ] VM (`192.168.96.110`) accessible via SSH

## Exploit Smoke Test Script
- [ ] Create `apps/javascript/app-36-parking-mgmt/tests/exploit-smoke.test.js`:
  - Use `http` module (no external test framework dependency)
  - Define helper: `request(method, path, { headers, body, sessionCookie })` → returns `{ status, body }`
  - Define helper: `assert(condition, message)` — throws on failure
  - Define helper: `login(username, password)` → returns session cookie / JWT token

### Test Cases
- [ ] **VULN-01 (A03 ES Injection)**:
  - `GET /api/spots/search?q=*:*` → response contains all 4 seeded spots
  - `GET /api/spots/search?q=Standard` → response contains only Standard spots
  - Verify injection broadened results beyond normal search scope
- [ ] **VULN-02 (A04 Client Pricing)**:
  - Login as alice_driver
  - `POST /api/bookings/book` with `{ spotId: 3, durationHours: 720, totalCost: 0 }`
  - Wait 3 seconds for Kafka consumer to process
  - `GET /api/bookings` → find zero-cost booking
  - Assert `totalCost === 0`
- [ ] **VULN-03 (A09 Missing Audit)**:
  - Login as alice_driver
  - `POST /api/bookings/<id>/cancel` on a booking
  - Wait 3 seconds
  - Verify audit log location (file/collection) — assert no entry for this cancellation
- [ ] **VULN-04 (A01 IDOR)**:
  - Login as alice_driver
  - `GET /api/bookings` → response includes bookings belonging to other users (bob_driver)
  - Assert response contains bookings where `userId !== session.userId`
- [ ] **VULN-05 (A05 Debug Config)**:
  - `GET /api/admin/debug` (no auth header)
  - Assert status 200
  - Assert response body contains `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `ELASTICSEARCH_URL`
- [ ] **VULN-06 (A10 SSRF)**:
  - Login as admin_attendant
  - `POST /api/spots/A-101/photo` with `{ imageUrl: "http://redis:6379/PING" }`
  - Check Docker logs for Redis container — assert connection received from web container
  - OR: assert response contains Redis protocol response (error string from Redis)
- [ ] **VULN-07 (A02 Hardcoded JWT)**:
  - Read `JWT_SECRET` from `src/config/appConfig.js` (hardcoded constant)
  - Using `jsonwebtoken` in test, sign `{ sub: 1, username: "alice_driver", role: "ADMIN" }` with that secret
  - `GET /api/admin/dashboard` with `Authorization: Bearer <forged_token>`
  - Assert status 200 (access granted despite being non-admin user)

### Chain Attack Tests
- [ ] **chain-01 (A03→A04→A09 → data_modification)**:
  - ES injection → find premium spot ID
  - Book with zero cost via client pricing → wait for Kafka consumer
  - GET bookings → verify zero-cost premium booking persisted
  - Cancel booking → verify no audit log
- [ ] **chain-02 (A05→A10 → lateral_movement)**:
  - Hit debug endpoint → extract `REDIS_URL`
  - Use `REDIS_URL` as `imageUrl` in photo import
  - Verify request reached Redis container (check logs)
- [ ] **chain-03 (A02→A07→A01 → db_exfiltration)**:
  - Extract hardcoded secret from config
  - Forge admin JWT
  - POST to export endpoint with `{ bookingIds: [1,2,3] }`
  - Assert response contains PII: license plates, emails, phone numbers, addresses, payment-last-4

### Decoy Verification Tests
- [ ] **D1**: Create spot via admin → verify audit event in logs
- [ ] **D2**: Search spot by ID → verify repo uses `findById`, not raw query
- [ ] **D3**: Call `allowedRedirect('http://evil.com')` → assert returns false
- [ ] **D4**: Cancel another user's booking → assert 403 Forbidden
- [ ] **D5**: `GET /api/health` → assert body is exactly `{ status: 'ok' }` (no extra fields)
- [ ] **D6**: `resolveAddress('http://redis:6379')` → assert throws/rejects
- [ ] **D7**: `POST /api/auth/refresh` with invalid `iss` claim → assert 401
- [ ] **D8**: Access admin route with non-admin session → assert 403

### Helper: Test Summary
- [ ] Print pass/fail counts
- [ ] Print each vuln/chain/decoys test result
- [ ] Exit with code 0 on all pass, 1 on any fail

## Local Docker Verification
- [ ] `docker compose up --build -d`
- [ ] Wait for all 6 containers to report healthy:
  ```bash
  docker compose ps --format json | grep -c '"Health":"healthy"'
  ```
- [ ] Run exploit smoke tests:
  ```bash
  node tests/exploit-smoke.test.js
  ```
- [ ] If tests pass → proceed to VM deployment
- [ ] If tests fail → fix issues, rebuild, retest

## VM Deployment & Testing
- [ ] Copy app source to VM (`192.168.96.110`):
  ```bash
  # Via paramiko or SCP
  scp -r apps/javascript/app-36-parking-mgmt/* user@192.168.96.110:/tmp/app-36/
  ```
- [ ] SSH into VM, build and start:
  ```bash
  ssh user@192.168.96.110
  cd /tmp/app-36
  docker compose build
  docker compose up -d
  ```
- [ ] Wait for all containers healthy (monitor via `docker compose ps`)
- [ ] Run exploit smoke tests on VM:
  ```bash
  # From VM or with port forwarding
  docker compose exec web node tests/exploit-smoke.test.js
  ```
- [ ] All tests pass on VM → verification complete

## Tear-down
- [ ] Stop and remove all Docker components on VM:
  ```bash
  cd /tmp/app-36
  docker compose down -v
  docker system prune -a -f --volumes
  ```
- [ ] Remove app source from VM:
  ```bash
  rm -rf /tmp/app-36
  ```

## Eval Report Generation
- [ ] Create `docs/plans/complexity/app-36-parking-mgmt/eval-report.md`

### eval-report.md Sections

#### Difficulty Assessment
| Vuln ID | OWASP | Location | Difficulty | Rationale |
|---------|-------|----------|------------|-----------|
| VULN-01 | A03 | `ParkingSearchClient.js` → `searchByQueryString()` | 1 | Single GET request; no auth needed; trivial payload `?q=*:*` |
| VULN-02 | A04 | `BookingProducer.js` → `publishBooking()` | 2 | Requires session; set `totalCost: 0` in POST body; wait for Kafka async |
| VULN-03 | A09 | `BookingConsumer.js` → `processCancellation()` | 2 | Requires session; cancel booking; verify no audit log entry |
| VULN-04 | A01 | `BookingController.js` → `listAll()` | 2 | Requires session; GET bookings returns cross-user data |
| VULN-05 | A05 | `AdminController.js` → `debugConfig()` | 1 | Single GET request; no auth needed; reads response body |
| VULN-06 | A10 | `SpotPhotoService.js` → `importPhoto()` | 3 | Requires admin session + knowledge of internal hostnames (from debug leak); POST with crafted URL |
| VULN-07 | A02 | `appConfig.js` (constant) | 2 | Requires reading source code or error trace for secret; forge JWT |
| chain-01 | A03→A04→A09 | 3 files across async boundary | 3 | Three steps across search controller, Kafka producer, Kafka consumer; must understand event-driven flow |
| chain-02 | A05→A10 | 2 files across container boundary | 3 | Must connect debug leak (step 1) to SSRF target (step 2); understand Docker internal networking |
| chain-03 | A02→A07→A01 | 3 layers across config/middleware/service + 2 DBs | 4 | Three steps across static config, auth middleware, and data service; must forge JWT and understand cross-DB join |

#### Hint Leakage Validation

| Search Scope | Files Scanned | Expected Matches | Status |
|-------------|---------------|-----------------|--------|
| All `.js` source files | (N to be determined) | 0 outside annotations | [PASS] / [FAIL] |
| Test files | (1) `tests/exploit-smoke.test.js` | 0 | [PASS] / [FAIL] |
| Config files (non-.vulns) | (docker-compose.yml, Dockerfile, .dockerignore) | 0 | [PASS] / [FAIL] |
| `package.json` | 1 | 0 | [PASS] / [FAIL] |

Run the search command and paste actual results.

#### Overall Assessment

- Total standalone vulnerabilities: 7
- Total chained attack scenarios: 3
- Total decoy patterns: 8
- OWASP categories covered: 8 of 10 (A01, A02, A03, A04, A05, A07, A09, A10)
- Average vuln difficulty: ~2.1
- Average chain difficulty: ~3.3
- Cross-boundary chains: 3 (all chains cross at least 2 code packages and a process/network/DB boundary)

## Final Artifact Audit
- [ ] `.vulns` audit:
  - Count `vulnerabilities` array: must be 7 entries
  - Count `chained_attacks` array: must be 3 entries
  - Count `decoys` array: must be 8 entries
  - Every entry's `location` points to an existing file
  - Every entry's `method` exists in the referenced file
  - Every OWASP ID matches the annotation in source
- [ ] `README.md` audit:
  - "Chained Vulnerability Scenario" section — 3 chains with complete tables
  - "API Endpoints" table — all 15+ endpoints listed
  - "Tech Stack" — all 6 infrastructure services + all npm packages
  - "Security Benchmarking" — references `.vulns`
- [ ] `scenarios.md` audit:
  - All 3 chain narratives present
  - Attack narratives match implemented exploit paths
  - Severity and combined impact correct

## Regular Commits
- [ ] Commit cadence:
  1. `app-36 phase-05: add exploit smoke test script`
  2. `app-36 phase-05: add eval-report.md with difficulty ratings and hint leakage results`
  3. `app-36 phase-05: final artifact audit -- .vulns, README, scenarios.md`

## Phase Status Report
- [ ] Create `phase-05/status-report.md`:
  - Final vuln count: 7 standalone
  - Final chain count: 3 (all cross-boundary)
  - Final decoy count: 8
  - OWASP coverage: 8 of 10 categories
  - All Docker tests passing on VM: YES / NO
  - Exploit smoke tests: (pass count) / (total)
  - Hint leakage: PASS / FAIL (expected: PASS with 0 matches)
  - Average difficulty: standalone ~2.1, chains ~3.3
  - VM resources fully torn down: YES / NO
