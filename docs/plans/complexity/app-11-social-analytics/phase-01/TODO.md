# Phase 01 TODO — Infrastructure Wiring

## Pre-requisites
- [ ] Read `vuln-inventory.md` — confirm all no-touch files
- [ ] Read `expansion-plan.md` — confirm phase scope
- [ ] Verify `docker-compose.yml` is present (already in app root — uses Redpanda, not ZooKeeper)
- [ ] Verify `appConfig.ts` already declares `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `ELASTICSEARCH_URL`

## Dependencies — Install packages
- [ ] Edit `package.json`: add `pg` and `@types/pg`
- [ ] Edit `package.json`: add `redis`
- [ ] Edit `package.json`: add `@elastic/elasticsearch`
- [ ] Edit `package.json`: add `kafkajs`
- [ ] Edit `package.json`: add `ws` and `@types/ws`
- [ ] Run `npm install` in app directory

## Config — PostgreSQL
- [ ] Create `src/config/db.ts`:
  - Import `pg` -> `Pool`
  - Create pool with `DATABASE_URL` from env
  - Add `waitForDb()` function: loop with 2s backoff, max 30 retries, resolve when `pool.query('SELECT 1')` succeeds
  - Add `getPool()` getter
  - Export singleton pool

## Config — Redis
- [ ] Create `src/config/cache.ts`:
  - Import `redis` -> `createClient`
  - Create client with `REDIS_URL` from env
  - Add `waitForRedis()` function: loop with 2s backoff, max 30 retries, resolve when `client.ping()` returns `PONG`
  - Add `getClient()` getter
  - Export singleton client

## Update App Wiring
- [ ] Edit `src/app.ts`:
  - Import `waitForDb`, `getPool` from `./config/db`
  - Import `waitForRedis`, `getClient` from `./config/cache`
  - Call `await waitForDb()` and `await waitForRedis()` before building DI graph
  - Keep existing `InMemoryDatabase` and `SessionCache` for now — repositories unchanged

## Update Index Entry Point
- [ ] Edit `src/index.ts`:
  - Convert to async: `const app = await createApp()` (if `createApp` becomes async for readiness checks)
  - Or keep sync if healthcheck route handles readiness

## Healthcheck
- [ ] Edit `src/controllers/HealthController.ts`:
  - Add PG pool check: `SELECT 1`
  - Add Redis client check: `PING`
  - Return JSON: `{ status: "ok", postgres: "connected", redis: "connected" }`

## Verification
- [ ] Start Docker Compose: `docker compose up -d`
- [ ] Wait for all healthchecks to pass (Web `healthy`, PG `pg_isready`, Redis `redis-cli ping`, Redpanda `rpk cluster info`, ES `_cluster/health`)
- [ ] Run `npm run build && npm start` inside container
- [ ] Verify health endpoint: `GET /api/health` -> 200 with PG + Redis status
- [ ] Verify all 14 endpoints respond:
  - `POST /api/auth/login` -> 200
  - `GET /api/auth/me` -> 200
  - `GET /api/widgets` -> 200
  - `POST /api/widgets` -> 200
  - `POST /api/preview` -> 200 (SSRF still works)
  - `GET /api/debug/config` -> 200 (leaks config)
  - `GET /api/debug/headers` -> 200
  - `GET /internal/search/admin?token=...` -> 200
- [ ] Verify existing vulnerabilities remain exploitable:
  - A10 SSRF: `POST /api/preview` with `url=http://localhost:6379` -> reaches Redis
  - A05 Debug: `GET /api/debug/config` -> leaks `internalSearchToken`
  - A01 Access Control: `GET /internal/search/admin?token=search-token-dev-8011&q=test` -> returns topology
  - A03 XSS: dashboard page renders widget titles with `innerHTML`
  - A05 Hardcoded Key: `public/js/app.js` contains `rpt_live_internal_44f8a2`
  - chain-01: Debug -> SSRF -> Internal Search pipeline still functional
- [ ] Verify decoys still present:
  - DECOY-01: `src/referenceGuards.ts` `allowedCallback` validates hostname against allowlist
  - DECOY-02: `src/cache/SessionCache.ts` uses `crypto.randomBytes`
- [ ] Confirm no annotation-bearing files were modified

## Regular Commits
- [ ] Commit after each major task:
  `git add -A && git commit -m "app-11 phase-01: <descriptive message>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-01/status-report.md` after completion:
  - What was implemented
  - Files created (count)
  - Files modified (count)
  - Vulnerabilities planted (type, location)
  - Decoys planted (location)
  - Existing vulns still intact? (yes/no)
  - Chains functional? (yes/no)
  - Tests passing? (yes/no)
  - Blockers
