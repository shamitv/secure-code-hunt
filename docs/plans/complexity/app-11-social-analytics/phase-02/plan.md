# Phase 02: PostgreSQL Migration + Dashboard Search

## Goal

Migrate `UserRepository` and `WidgetRepository` from in-memory arrays to real PostgreSQL queries. Create SQL schema migrations for all tables (`users`, `widgets`, `dashboards`, `analytics_events`). Seed realistic mock data. Build `DashboardRepository` with an intentionally vulnerable `search()` method. Plant two standalone vulnerabilities: A03 SQL Injection on dashboard search and A05 (variant) environment dump endpoint. Add parameterized decoy queries in adjacent repositories.

## Scope

### Included
- [ ] Create `src/config/schema.sql` — DDL for all tables:
  - `users`, `widgets`, `dashboards`, `analytics_events` (partitioned by month), `share_tokens`
- [ ] Create `src/config/seed.sql` — INSERT statements for 3 users, 6 widgets, 6 dashboards, 20 analytics events
- [ ] Run schema + seed migrations at app startup via `db.ts`
- [ ] Rewrite `UserRepository` — parameterized PG queries (decoy for A03)
- [ ] Rewrite `WidgetRepository` — parameterized PG queries (decoy for A03)
- [ ] Create `src/repositories/DashboardRepository.ts` — with vulnerable `search(query)` method
- [ ] Create `src/repositories/AnalyticsRepository.ts` — parameterized PG queries (decoy for A03)
- [ ] Create `src/services/ConfigService.ts` — wraps `process.env` for config controller
- [ ] Create `src/controllers/ConfigController.ts` — `getEnv()` endpoint
- [ ] Create `src/controllers/DashboardController.ts` — CRUD + search
- [ ] Create `src/routes/configRoutes.ts` and `src/routes/dashboardRoutes.ts`
- [ ] **Plant A03 (SQLi)**: `DashboardRepository.search()` uses raw string interpolation
- [ ] **Plant A05 (variant)**: `ConfigController.getEnv()` returns raw `process.env`
- [ ] **Plant chain-02 step 1 (A04)**: `WidgetController.createWidget()` trusts `config` field without validation

### Excluded
- No Elasticsearch integration (Phase 3)
- No Kafka real wire-up (Phase 4)
- No WebSocket or UI changes (Phase 5)
- No changes to annotation-bearing files (see vuln-inventory no-touch list)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Schema runs at app startup via `fs.readFileSync` + `pool.query` | Simple migration strategy for dev benchmark — no migration framework overhead |
| `analytics_events` uses declarative partitioning | Matches TimescaleDB-style pattern from plan.md using native PG partitions |
| `DashboardRepository.search()` uses raw `SELECT * FROM dashboards WHERE name LIKE '%${query}%'` | Classic SQLi pattern — parameterized auth/login queries in same file serve as decoy |
| `ConfigController.getEnv()` as separate from `DebugController.getConfig()` | Existing debug controller returns structured appConfig; new env endpoint dumps raw `process.env` with credentials — differentiated A05 variants |
| Widget config validation skipped by design | Mirrors real-world "trust the client" anti-pattern; whitelist validation on `updateWidget()` serves as decoy |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A03 | CWE-89 | `src/repositories/DashboardRepository.ts` -> `search()` | Raw `${query}` string interpolation into SELECT query on dashboard names | High |
| 2 | Standalone | A05 | CWE-200 | `src/controllers/ConfigController.ts` -> `getEnv()` | Unauthenticated endpoint returns entire `process.env` including DB passwords, broker URLs, keys | Medium |
| 3 | Chain Link 1 (chain-02) | A04 | CWE-451 | `src/controllers/WidgetController.ts` -> `createWidget()` | Widget `config` JSON accepted without whitelist — attacker can inject `renderScript` payload | Low |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/repositories/UserRepository.ts` -> `findByUsername()` | Same file as other DB queries; uses string building | Uses `$1` parameterized placeholder |
| 2 | `src/repositories/WidgetRepository.ts` -> `findByUserId()` | Same file and pattern as DashboardRepository | Uses `$1` parameterized placeholder |
| 3 | `src/repositories/AnalyticsRepository.ts` -> `insertEvent()` | Adjacent file to vulnerable DashboardRepository | Uses `$1, $2, $3` parameterized placeholders |
| 4 | `src/controllers/WidgetController.ts` -> `updateWidget()` | Same controller as createWidget; also accepts config | Validates config against hardcoded whitelist before save |

## Data Model Changes

### New Tables (full DDL in `src/config/schema.sql`)

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | `id SERIAL PK`, `username VARCHAR`, `password VARCHAR`, `display_name VARCHAR` | User accounts (migrated from InMemoryDatabase) |
| `widgets` | `id SERIAL PK`, `user_id FK`, `title VARCHAR`, `type VARCHAR`, `config JSONB`, `value VARCHAR` | Dashboard widgets |
| `dashboards` | `id SERIAL PK`, `user_id FK`, `name VARCHAR`, `layout JSONB`, `created_at TIMESTAMP` | Saved dashboard configurations |
| `analytics_events` | `id BIGSERIAL`, `widget_id FK`, `event_type VARCHAR(50)`, `payload JSONB`, `created_at TIMESTAMP` | Partitioned metrics (by month) |
| `share_tokens` | `id SERIAL PK`, `dashboard_id FK`, `token VARCHAR(255)`, `created_by FK`, `created_at TIMESTAMP` | Dashboard sharing (used in Phase 3) |

## API Contracts

### New Endpoints

| Method | Path | Auth | Description | Controller |
|--------|------|------|-------------|------------|
| GET | `/api/config/env` | ANY | Returns raw `process.env` (A05) | `ConfigController.getEnv()` |
| GET | `/api/dashboards` | ANY | Lists current user's dashboards | `DashboardController.list()` |
| POST | `/api/dashboards` | ANY | Creates a dashboard | `DashboardController.create()` |
| GET | `/api/dashboards/search?q=...` | ANY | Searches dashboards by name (A03 SQLi) | `DashboardController.search()` |

## Artifact Updates

- `apps/typescript/app-11-social-analytics/src/config/schema.sql` — new file
- `apps/typescript/app-11-social-analytics/src/config/seed.sql` — new file
- `apps/typescript/app-11-social-analytics/src/config/db.ts` — add `runMigrations()`, `seedData()` (extend from Phase 1)
- `apps/typescript/app-11-social-analytics/src/repositories/UserRepository.ts` — rewrite with PG parameterized queries
- `apps/typescript/app-11-social-analytics/src/repositories/WidgetRepository.ts` — rewrite with PG parameterized queries
- `apps/typescript/app-11-social-analytics/src/repositories/DashboardRepository.ts` — new file
- `apps/typescript/app-11-social-analytics/src/repositories/AnalyticsRepository.ts` — new file
- `apps/typescript/app-11-social-analytics/src/services/ConfigService.ts` — new file
- `apps/typescript/app-11-social-analytics/src/controllers/ConfigController.ts` — new file
- `apps/typescript/app-11-social-analytics/src/controllers/DashboardController.ts` — new file
- `apps/typescript/app-11-social-analytics/src/routes/configRoutes.ts` — new file
- `apps/typescript/app-11-social-analytics/src/routes/dashboardRoutes.ts` — new file
- `apps/typescript/app-11-social-analytics/src/app.ts` — wire new routes and DI
- `apps/typescript/app-11-social-analytics/.vulns` — add VULN-06 (A03), VULN-07 (A05), chain-02 step 1
- `apps/typescript/app-11-social-analytics/README.md` — update endpoint table, chain section
- `apps/typescript/app-11-social-analytics/scenarios.md` — add chain-02 narrative
- `apps/typescript/app-11-social-analytics/src/controllers/WidgetController.ts` — add chain-02 step 1 annotation (A04 config abuse)

## Dependencies on Other Phases

- **Depends on**: Phase 1 — real PostgreSQL must be connected for schema/seed
- **Required by**: Phase 3 — ShareService needs dashboards table + share_tokens table
- **Required by**: Phase 4 — AnalyticsRepository + Kafka consumer needs analytics_events table
