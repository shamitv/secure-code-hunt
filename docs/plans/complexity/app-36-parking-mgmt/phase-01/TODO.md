# Phase 01 TODO — PostgreSQL Wiring + Core Migrations

## Pre-requisites
- [ ] Read `vuln-inventory.md` — confirm no-touch files and existing vulns
- [ ] Read `expansion-plan.md` — understand full architecture and phase dependencies
- [ ] Verify existing `docker-compose.yml` has PostgreSQL service running

## Install & Configure
- [ ] Add `pg` to `package.json` dependencies (`npm install pg`)
- [ ] Remove `sqlite3` from `package.json`; run `npm uninstall sqlite3`
- [ ] Create `.env.example`:
  ```env
  DATABASE_URL=postgresql://parking:parkingpass@localhost:5432/parkingdb
  PORT=8036
  NODE_ENV=development
  ```

## Database Setup
- [ ] Create `src/config/postgres.js`:
  - Import `pg.Pool`
  - Create and export pool using `DATABASE_URL` from `appConfig.js`
  - Add `pool.on('error', ...)` reconnect handler
- [ ] Create `migrations/001-init.sql`:
  - `CREATE TABLE IF NOT EXISTS users (...)` with all columns from plan
  - `CREATE TABLE IF NOT EXISTS spots (...)`
  - `CREATE TABLE IF NOT EXISTS bookings (...)` with foreign keys
- [ ] Create `migrations/002-seed.sql`:
  - Insert 3 users (alice_driver, bob_driver, admin_attendant) with bcrypt-hashed passwords
  - Insert 4 spots (A-101 Standard $5, A-102 Standard $5, B-201 Premium $12, B-202 Premium $12)
  - Insert 1 sample booking (alice_driver on A-101, 2 hours, $10)
- [ ] Add migration runner to `src/app.js` or a `src/config/migrate.js`:
  - On startup, read `migrations/*.sql` in order
  - Execute each file against the pool
  - Log success/error for each migration

## Repository Rewrite
- [ ] Rewrite `src/repositories/UserRepository.js`:
  - `findByUsername(pool, username)` → `SELECT * FROM users WHERE username = $1` (parameterized)
  - `findById(pool, id)` → `SELECT * FROM users WHERE id = $1` (parameterized)
  - `create(pool, user)` → `INSERT INTO users (...) VALUES (...) RETURNING *`
- [ ] Rewrite `src/repositories/SpotRepository.js`:
  - `findAll(pool)` → `SELECT * FROM spots ORDER BY spot_number`
  - `findById(pool, id)` → `SELECT * FROM spots WHERE id = $1` (parameterized)
  - `findByType(pool, type)` → `SELECT * FROM spots WHERE type = $1` (parameterized)
  - `create(pool, spot)` → `INSERT INTO spots (...) VALUES (...) RETURNING *`
- [ ] Rewrite `src/repositories/BookingRepository.js`:
  - `findAll(pool)` → `SELECT * FROM bookings ORDER BY created_at DESC` (**no ownership filter — IDOR**) — add annotation
  - `findById(pool, id)` → `SELECT * FROM bookings WHERE id = $1` (**no ownership check — IDOR**) — add annotation
  - `findByUserId(pool, userId)` → `SELECT * FROM bookings WHERE user_id = $1` (parameterized)
  - `create(pool, booking)` → `INSERT INTO bookings (...) VALUES (...) RETURNING *`
  - `update(pool, id, changes)` → `UPDATE bookings SET ... WHERE id = $1 RETURNING *`
- [ ] Remove `src/db/InMemoryStore.js`

## Controller Updates
- [ ] Update `src/controllers/BookingController.js`:
  - Wire `BookingRepository` with `pgPool` dependency
  - Add `listAll(req, res)` handler → calls `BookingRepository.findAll()` (IDOR — returns all bookings)
  - Add `getById(req, res)` handler → calls `BookingRepository.findById(req.params.id)` (IDOR — no ownership check)
  - Keep existing `book()` handler — wire to new `BookingRepository.create()`
  - Update `cancel()` handler — wire to new `BookingRepository.update()` with **ownership check** (`booking.userId === req.session.userId`) as Decoy D4
  - Add `// VULNERABILITY A01: Booking list/detail returns records for any user without ownership verification.` above `listAll()`
  - Add `// VULNERABILITY A01: Booking detail returns record regardless of session ownership.` above `getById()`
- [ ] Update `src/controllers/AuthController.js` — wire `UserRepository` with `pgPool`
- [ ] Update `src/controllers/SpotController.js` — wire `SpotRepository` with `pgPool`

## Route Updates
- [ ] Update `src/routes/bookingRoutes.js`:
  - Add `router.get('/', bookingController.listAll)` — A01 IDOR
  - Add `router.get('/:id', bookingController.getById)` — A01 IDOR

## App Factory Update
- [ ] Update `src/app.js` `createApp()`:
  - Import and call migration runner before `app.listen()`
  - Create `pgPool` and inject into all controllers/repositories
  - Remove `InMemoryStore` import and instantiation

## Dependency Injection
- [ ] Update `src/config/appConfig.js`:
  - Ensure `DATABASE_URL` is read from `process.env.DATABASE_URL`
  - Fallback to compose default: `postgresql://parking:parkingpass@postgres:5432/parkingdb`

## Artifact Updates
- [ ] Update `.vulns`:
  - Add VULN-04 entry: `owasp_id: "A01"`, `category: "Broken Access Control"`, `severity: "medium"`, `cwe: "CWE-639"`
  - Add D4 to `decoys` array: location `src/controllers/BookingController.js`, description "Cancellation verifies user ownership before allowing mutation"
- [ ] Update `apps/javascript/app-36-parking-mgmt/README.md`:
  - Update "Tech Stack" to include PostgreSQL
  - Update "API Endpoints" table with new `GET /api/bookings` and `GET /api/bookings/:id` rows
  - Update "Security Benchmarking" section with VULN-04 note
- [ ] Update `apps/javascript/app-36-parking-mgmt/scenarios.md`:
  - Add VULN-04 description paragraph under a new "Standalone Vulnerabilities" section

## Regular Commits
- [ ] Commit after each major task:
  ```
  git add -A && git commit -m "app-36 phase-01: <descriptive message>"
  ```
- [ ] Suggested commit points:
  1. `app-36 phase-01: add pg dependency, remove sqlite3, create .env.example`
  2. `app-36 phase-01: create PostgreSQL migrations (schema + seed)`
  3. `app-36 phase-01: rewrite repositories to use PostgreSQL`
  4. `app-36 phase-01: plant VULN-04 (A01 IDOR) + decoy D4, update controllers and routes`
  5. `app-36 phase-01: wire pgPool injection, remove InMemoryStore, update artifacts`

## Phase Status Report
- [ ] Create `phase-01/status-report.md` after completion:
  - What was implemented
  - Files created (count)
  - Files modified (count)
  - Vulnerabilities planted (type, location)
  - Decoys planted (location)
  - Existing vulns still intact? (yes/no)
  - Chains functional? (yes/no for chain-01)
  - Tests passing? (contract test)
  - Blockers

## Verification
- [ ] `docker compose up --build` — all services healthy, app responds on port 8036
- [ ] `POST /api/auth/login` with `admin_attendant` credentials returns session cookie
- [ ] `GET /api/bookings` with admin session returns all 1+ bookings (IDOR — returns all, not just own)
- [ ] `GET /api/bookings/1` returns alice_driver's booking with any session (IDOR — no ownership check)
- [ ] `POST /api/bookings/:id/cancel` fails if `booking.userId !== session.userId` (Decoy D4 working)
- [ ] `POST /api/auth/register` creates new user in PostgreSQL
- [ ] `POST /api/admin/spots` creates new spot in PostgreSQL
- [ ] `GET /api/spots/search?q=Standard` returns Standard spots from PostgreSQL
- [ ] All 3 existing vulnerabilities (A03, A04, A09) still exploitable
- [ ] All 3 existing decoys (D1-D3) still present
- [ ] `node tests/contract.test.js` — contract test passes
- [ ] `.vulns` updated with VULN-04 and D4
- [ ] `README.md` updated
- [ ] `scenarios.md` updated
- [ ] `.env.example` exists with correct variables
