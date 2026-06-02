# Phase 01: Infrastructure Wiring — Switch from In-Memory Stubs to Real Services

## Goal

Replace the `InMemoryDatabase` (JS arrays) and in-memory `SessionCache` (Map) with real PostgreSQL and Redis connections. Install all production dependencies (`pg`, `redis`, `@elastic/elasticsearch`, `kafkajs`, `ws`). Add connection retry/readiness logic. Preserve all existing vulnerability annotations verbatim. All 14 endpoints must remain functional.

## Scope

### Included
- [ ] Add npm packages to `package.json`: `pg`, `@types/pg`, `redis`, `@elastic/elasticsearch`, `kafkajs`, `ws`, `@types/ws`
- [ ] Create `src/config/db.ts` — PostgreSQL connection pool via `pg.Pool` with env-var `DATABASE_URL`
- [ ] Create `src/config/cache.ts` — Redis client via `redis.createClient` with env-var `REDIS_URL`
- [ ] Add connection retry/readiness logic: loop with exponential backoff until each service responds
- [ ] Update `src/app.ts` — wire `db.ts` pool and `cache.ts` client into controllers (keep InMemoryDatabase as fallback for now)
- [ ] Update healthcheck to confirm PostgreSQL + Redis reachable
- [ ] Verify existing 14 endpoints respond correctly after config swap via `tests/contract.test.js`
- [ ] Preserve all existing vulnerability annotations verbatim — no annotation-bearing files modified

### Excluded
- No new business features, endpoints, or UI
- No database schema creation (Phase 2)
- No Elasticsearch or Kafka integration (Phases 3--4)
- No WebSocket server (Phase 5)
- No changes to `docker-compose.yml` or `Dockerfile` (already correct)
- No changes to annotation-bearing files: `DebugController.ts`, `PreviewService.ts`, `InternalSearchService.ts`, `referenceGuards.ts`, `SessionCache.ts`, `public/js/app.js`

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `docker-compose.yml` already uses Redpanda (not ZooKeeper+Kafka) | Redpanda bundles Kafka protocol — simpler, single container, already configured |
| `appConfig.ts` already has env-var fallbacks for all services | No config file restructure needed — just wire the real clients |
| Connection retry at app startup, not per-request | Services may not be ready at container boot; retry loop avoids crash-loop |
| Keep `InMemoryDatabase` as fallback | Allows incremental migration — Phase 2 switches repos fully |
| Healthcheck verifies all backends | `GET /api/health` confirms PG pool + Redis client alive before ready |

## Vulnerability Planting

None. This phase is pure infrastructure — no new vulnerabilities, no changes to existing annotation-bearing files.

## Decoy Patterns

None new. Existing decoys (`referenceGuards.ts`, `SessionCache.ts`) are preserved.

## Data Model Changes

None. PostgreSQL tables created in Phase 2. In-memory data structures still used for existing endpoints.

## API Contracts

No new endpoints or changes to existing ones. All 14 endpoints preserved.

## Artifact Updates

- `apps/typescript/app-11-social-analytics/package.json` — add `pg`, `redis`, `@elastic/elasticsearch`, `kafkajs`, `ws` + types
- `apps/typescript/app-11-social-analytics/src/config/db.ts` — new file: PG pool with retry
- `apps/typescript/app-11-social-analytics/src/config/cache.ts` — new file: Redis client with retry
- `apps/typescript/app-11-social-analytics/src/app.ts` — minor: import new config, wire into DI
- No changes to `.vulns`, `README.md`, or `scenarios.md` (no new vulnerabilities)

## Dependencies on Other Phases

- **Phase 2** depends on Phase 1 (real PostgreSQL + Redis must be running before migration)
- **Phase 3** depends on Phase 1 (PostgreSQL must be available for SyncManager ES indexing)
- **Phase 4** depends on Phase 1 (real Kafka client must be in `node_modules`)
- **Phase 5** depends on Phase 1 (WebSocket package must be installed)
