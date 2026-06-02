# Phase 01 TODO — Infrastructure Wiring + Data Migration

## Pre-requisites

- [ ] Read `vuln-inventory.md` — confirm no-touch files and existing vulnerability locations
- [ ] Read `expansion-plan.md` — understand architecture decisions and API inventory
- [ ] Verify `docker-compose.yml` has PostgreSQL and Redis services with healthchecks

## Dependencies

- [ ] Add `pg` to `package.json` dependencies
- [ ] Add `ioredis` to `package.json` dependencies
- [ ] Run `npm install`

## Database Configuration

- [ ] Create `src/config/db.js`:
  - [ ] Import `pg` → `Pool`
  - [ ] Read `DATABASE_URL` from `process.env` (fallback: `postgres://iot:iotpass@localhost:5432/iotdb`)
  - [ ] Export pool instance with connection timeout config

- [ ] Create `src/config/redis.js`:
  - [ ] Import `ioredis` → `Redis`
  - [ ] Read `REDIS_URL` from `process.env` (fallback: `redis://localhost:6379/17`)
  - [ ] Export Redis client instance

## Schema Migration + Seed

- [ ] Create `src/config/migrate.js`:
  - [ ] Import `db.js` pool
  - [ ] Execute `CREATE TABLE IF NOT EXISTS users (...)` 
  - [ ] Execute `CREATE TABLE IF NOT EXISTS devices (...)`
    - Ensure `device_secret VARCHAR(255) NOT NULL` column
    - Add comment: `// VULNERABILITY A02: Device access tokens are stored as plaintext fields.`
  - [ ] Execute `CREATE TABLE IF NOT EXISTS telemetry_streams (...)`
  - [ ] Execute `CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_streams(device_id, recorded_at)`
  - [ ] Check if users table is empty; if so, insert seed data:
    - `alice_owner` / bcrypt(`alice123`) / `CUSTOMER`
    - `admin_iot` / bcrypt(`adminSecureIoT2026!`) / `ADMIN`
  - [ ] Check if devices table is empty; if so, insert seed data:
    - Smart Thermostat, `ONLINE`, `IOT-DEV-KEY-THERMO-1122`
    - Security Gateway, `ONLINE`, `IOT-DEV-KEY-GATEWAY-8877`
  - [ ] Check if telemetry_streams is empty; if so, insert 10 rows (5 per device, staggered timestamps)
  - [ ] Log migration success to console

- [ ] Call `migrate()` in `src/index.js` before `app.listen()`
  - [ ] Wrap in try/catch — log error and exit if migration fails

## PostgreSQL Repositories

- [ ] Create `src/repositories/PgUserRepository.js`:
  - [ ] `findByUsername(username)` — `SELECT * FROM users WHERE username = $1` (parameterized)
  - [ ] `saveCustomer(username, password)` — bcrypt hash + `INSERT INTO users` (parameterized)
  - [ ] Decoy: Parameterized queries throughout — safe pattern

- [ ] Create `src/repositories/PgDeviceRepository.js`:
  - [ ] `findById(id)` — `SELECT * FROM devices WHERE id = $1` (parameterized)
  - [ ] `findAll()` — `SELECT * FROM devices`
    - [ ] Annotation: `// VULNERABILITY A02: Device access tokens are stored as plaintext fields.`
  - [ ] Decoy: No raw string concatenation — uses `$1` placeholders

- [ ] Create `src/repositories/TelemetryRepository.js`:
  - [ ] `findByDeviceId(deviceId)` — `SELECT * FROM telemetry_streams WHERE device_id = $1 ORDER BY recorded_at DESC`
  - [ ] `findByDeviceIdAndRange(deviceId, from, to)` — parameterized query with `$1, $2, $3`
  - [ ] `queryWithFilter(deviceId, rawFilter)` — **VULNERABILITY**: concatenates `rawFilter` into WHERE clause via template literal

## Redis Session Cache

- [ ] Create `src/cache/RedisSessionCache.js` (or add Redis methods to `SessionCache.js`):
  - [ ] `save(sessionId, user)` — `SET session:<id> <JSON user>` with TTL (e.g., 3600s)
  - [ ] `get(sessionId)` — `GET session:<id>`, parse JSON if found
  - [ ] `delete(sessionId)` — `DEL session:<id>`
  - [ ] Keep existing in-memory `Map` methods for fallback/debug

## Telemetry Services

- [ ] Create `src/services/TelemetryQueryService.js`:
  - [ ] Constructor accepts `TelemetryRepository`
  - [ ] `getDeviceTelemetry(deviceId)` — calls `findByDeviceId` (no ownership check)
  - [ ] `getDeviceTelemetryRange(deviceId, from, to)` — calls `findByDeviceIdAndRange` (parameterized)
  - [ ] `queryDeviceTelemetry(deviceId, filter)` — calls `queryWithFilter`
    - [ ] Annotation: `// VULNERABILITY A03: Raw SQL filter string concatenated into telemetry SELECT query.`
    - [ ] Annotation: `// CHAIN LINK 2 (chain-02): Telemetry filter allows SQL injection enabling UNION SELECT on users/devices table.`

## Controllers + Routes

- [ ] Extend `src/controllers/DeviceController.js`:
  - [ ] `getDeviceTelemetry(req, res)` — uses `telemetryQueryService.getDeviceTelemetry(req.params.id)`
    - [ ] Annotation: `// VULNERABILITY A01: Device telemetry endpoint returns data without verifying device ownership.`
    - [ ] Annotation: `// CHAIN LINK 1 (chain-02): Telemetry endpoint accepts any device ID regardless of requesting user.`
  - [ ] `queryDeviceTelemetry(req, res)` — uses `telemetryQueryService.queryDeviceTelemetry(req.params.id, req.body.filter)`
  - [ ] `getDeviceTelemetryRange(req, res)` — uses `telemetryQueryService.getDeviceTelemetryRange(req.params.id, req.query.from, req.query.to)`
    - [ ] Decoy: Adds comment `// DECOY: Uses parameterized queries for timestamp range filtering.`

- [ ] Extend `src/routes/deviceRoutes.js`:
  - [ ] `GET /:id/telemetry` → `deviceController.getDeviceTelemetry`
  - [ ] `POST /:id/telemetry/query` → `deviceController.queryDeviceTelemetry`
  - [ ] `GET /:id/telemetry/range` → `deviceController.getDeviceTelemetryRange`
  - [ ] All behind `requireAuth` middleware

## App Wiring

- [ ] Refactor `src/app.js`:
  - [ ] Import `TelemetryQueryService` and `TelemetryRepository` (in addition to existing imports)
  - [ ] Instantiate `TelemetryRepository` with the `db` pool
  - [ ] Instantiate `TelemetryQueryService` with the `TelemetryRepository`
  - [ ] Instantiate `RedisSessionCache` (or updated `SessionCache`) with Redis client
  - [ ] Replace `SessionCache` with Redis-backed version
  - [ ] Pass `telemetryQueryService` to `DeviceController` (extend constructor)
  - [ ] Wire new routes
  - [ ] Keep `InMemoryStore` import for reference (don't remove no-touch code)

## Metadata Updates

- [ ] Update `.vulns`:
  - [ ] Add VULN-05: A03, CWE-89, `src/services/TelemetryQueryService.js`, `queryDeviceTelemetry()`, medium
  - [ ] Add VULN-06: A01, CWE-639, `src/controllers/DeviceController.js`, `getDeviceTelemetry()`, medium
  - [ ] Update VULN-01 location: `src/repositories/PgDeviceRepository.js`, `findAll()`, line_range update
  - [ ] Add 3 new decoys to `decoys[]` array
  - [ ] Add chain-02 skeleton to `chained_attacks[]` (step descriptions included; full narrative in Phase 2)

- [ ] Update `README.md`:
  - [ ] Add new endpoints to API table
  - [ ] Add chain-02 row to Chained Vulnerability Scenario section (step descriptions)

- [ ] Update `scenarios.md`:
  - [ ] Add chain-02 entry with step descriptions (narrative fleshed out in Phase 2)

## Regular Commits

- [ ] Commit after schema/migration: `git add -A && git commit -m "app-17 phase-01: PostgreSQL schema + migration + seed data"`
- [ ] Commit after repositories: `git add -A && git commit -m "app-17 phase-01: PostgreSQL repositories + Redis session cache"`
- [ ] Commit after telemetry endpoints: `git add -A && git commit -m "app-17 phase-01: telemetry endpoints with A03 (SQLi) and A01 (IDOR)"`
- [ ] Commit after metadata: `git add -A && git commit -m "app-17 phase-01: .vulns, README, scenarios.md updated for phase-01"`
- [ ] Push to remote after each commit

## Phase Status Report

- [ ] Create `phase-01/status-report.md` after completion:
  - What was implemented
  - Files created (count)
  - Files modified (count)
  - Vulnerabilities planted (type, location)
  - Decoys planted (location)
  - Existing vulns still intact? (yes/no)
  - Tests passing? (yes/no)
  - Blockers

## Verification

- [ ] PostgreSQL connection succeeds on app startup
- [ ] Redis connection succeeds on app startup
- [ ] Schema migration creates all 3 tables
- [ ] Seed data inserted correctly (2 users, 2 devices, 10 telemetry records)
- [ ] `POST /api/auth/register` creates user in PostgreSQL (not in-memory)
- [ ] `POST /api/auth/login` authenticates against PostgreSQL users
- [ ] `GET /api/devices/1` returns device detail (no secret)
- [ ] `GET /api/devices/1/telemetry` returns telemetry for device 1
- [ ] `GET /api/devices/2/telemetry` returns telemetry for device 2 (IDOR — different device, same user)
- [ ] `POST /api/devices/1/telemetry/query` with `{"filter": "1=1"}` returns all telemetry
- [ ] `POST /api/devices/1/telemetry/query` with `{"filter": "1; SELECT 1--"}` triggers SQL injection attempt
- [ ] `GET /api/devices/1/telemetry/range?from=...&to=...` uses parameterized query (safe)
- [ ] Existing chain-01 still exploitable (command error → SSRF → telemetry token leak)
- [ ] `tests/contract.test.js` passes
- [ ] All existing vulnerabilities still exploitable
- [ ] All new vulnerabilities exploitable
- [ ] Decoys present near vulnerable code paths
- [ ] No regression in existing endpoint responses
