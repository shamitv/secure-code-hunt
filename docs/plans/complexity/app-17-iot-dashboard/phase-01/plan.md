# Phase 01: Infrastructure Wiring + Data Migration

## Goal

Wire the existing Docker Compose infrastructure (PostgreSQL, Redis) into the Express application,
replacing in-memory stubs with real database and cache connections. Plant two new standalone
vulnerabilities: A03 SQL injection in a telemetry query endpoint and A01 IDOR on device telemetry.

## Scope

### Included

- [ ] Add `pg` and `ioredis` dependencies to `package.json`
- [ ] Create `src/config/db.js` — PostgreSQL connection pool using `DATABASE_URL`
- [ ] Create `src/config/redis.js` — Redis client using `REDIS_URL`
- [ ] Create SQL schema migration: `users`, `devices`, `telemetry_streams` tables
- [ ] Create seed data script: 2 users, 2 devices (with plaintext secrets), 10 telemetry records
- [ ] Create `src/repositories/PgUserRepository.js` — PostgreSQL-backed user persistence
- [ ] Create `src/repositories/PgDeviceRepository.js` — PostgreSQL-backed device persistence
- [ ] Create `src/repositories/TelemetryRepository.js` — PostgreSQL-backed telemetry queries with raw SQL
- [ ] Wire `SessionCache` to use Redis (create `RedisSessionCache` or add Redis methods to existing class)
- [ ] Refactor `src/app.js` — swap InMemoryStore references for PostgreSQL + Redis while preserving fallback
- [ ] Add `GET /api/devices/:id/telemetry` endpoint (IDOR — no ownership check)
- [ ] Add `GET /api/devices/:id/telemetry/range` endpoint (decoy — parameterized query)
- [ ] Add `POST /api/devices/:id/telemetry/query` endpoint (SQLi via filter parameter)
- [ ] Plant VULN A03 annotation in telemetry query service
- [ ] Plant VULN A01 annotation in device telemetry controller
- [ ] Plant VULN A02 annotation migration (from InMemoryStore to PostgreSQL schema/repository)
- [ ] Add decoys documented in this phase's Decoy Patterns table
- [ ] Update `.vulns` with new vulnerabilities
- [ ] Update `README.md` chain section (chain-02 components added — narrative in Phase 2)
- [ ] Update `scenarios.md`
- [ ] Run existing `tests/contract.test.js` — ensure no regressions

### Excluded

- Redpanda/Kafka real wiring (Phase 2)
- Elasticsearch real wiring (Phase 2)
- WebSocket server + HTML dashboard (Phase 3)
- Chain-02 full implementation (Phase 2 — this phase plants the components but chain is documented in Phase 2)

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Keep InMemoryStore.js as fallback | Preserves no-touch baseline; pg-backed repos wrap the same interface |
| Use raw `pg` (not Sequelize/Knex) | Keeps SQL injection vulnerability realistic — ORM would abstract away raw queries |
| Separate TelemetryRepository from DeviceRepository | Telemetry queries involve different table + injection surface |
| Redis for sessions only | SessionCache → Redis is the only cache use-case; device data stays in PostgreSQL |
| Migration via JS script (not CLI tool) | Simpler for benchmark — run `node src/config/migrate.js` at app startup |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Method | Description | Severity |
|---|---|---|---|---|---|---|---|
| 1 | New standalone | A03 | CWE-89 | `src/services/TelemetryQueryService.js` (new) | `queryTelemetry()` | Telemetry filter parameter concatenated into raw SQL SELECT via template literal | medium |
| 2 | New standalone | A01 | CWE-639 | `src/controllers/DeviceController.js` | `getDeviceTelemetry()` | Device telemetry endpoint returns data without verifying the requesting user owns the device | medium |
| 3 | Existing (migrated) | A02 | CWE-312 | `src/repositories/PgDeviceRepository.js` or SQL schema | `findAll()` or CREATE TABLE | Device access tokens stored as plaintext column `device_secret` | medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|---|---|---|
| 1 | `src/services/TelemetryQueryService.js` → `queryByTimeRange()` | Accepts `from`/`to` parameters for telemetry filtering — same file as SQLi | Uses parameterized `$1`, `$2` placeholders instead of string concatenation |
| 2 | `src/controllers/DeviceController.js` → `detail()` | Returns device info by ID — same controller as IDOR endpoint | Strips `deviceSecret` field; returns only `id`, `name`, `status` |
| 3 | `src/repositories/PgUserRepository.js` → `saveCustomer()` | User passwords flow through this method — looks like it could store plaintext | Uses `bcrypt.hashSync()` with salt rounds = 10 before storing `password_hash` |

## Data Model Changes

### New Tables

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER'
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
  device_secret VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry_streams (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id),
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Seed Data

| Table | Rows | Content |
|---|---|---|
| `users` | 2 | `alice_owner` / bcrypt(`alice123`), `admin_iot` / bcrypt(`adminSecureIoT2026!`) |
| `devices` | 2 | Smart Thermostat (secret: `IOT-DEV-KEY-THERMO-1122`), Security Gateway (secret: `IOT-DEV-KEY-GATEWAY-8877`) |
| `telemetry_streams` | 10 | 5 records per device at staggered timestamps with varying temperature/humidity |

## API Contracts

### New Endpoints

**GET `/api/devices/:id/telemetry`** (Auth: Session cookie)
- **Vulnerability**: A01 IDOR — returns telemetry for any device ID, no ownership verification
- **Response**: `{ deviceId, telemetry: [{ temperature, humidity, recorded_at }] }`

**POST `/api/devices/:id/telemetry/query`** (Auth: Session cookie)
- **Vulnerability**: A03 SQLi — `filter` body parameter injected into WHERE clause
- **Request body**: `{ "filter": "temperature > 30" }`
- **Response**: `{ deviceId, filter, results: [...] }`

**GET `/api/devices/:id/telemetry/range`** (Auth: Session cookie)
- **Decoy**: Parameterized query using `?from=...&to=...` query strings
- **Response**: `{ deviceId, from, to, telemetry: [...] }`

## Artifact Updates

- `.vulns`: Add VULN-05 (A03), VULN-06 (A01); update VULN-01 location from InMemoryStore → PostgreSQL; add 3 new decoys
- `README.md`: Update API endpoint table; chain-02 entries added (step descriptions only, full narrative in Phase 2)
- `scenarios.md`: Add chain-02 skeleton (narrative filled in Phase 2)

## Dependencies on Other Phases

- **Required by**: Phase 2 — Redpanda consumer reads from `devices` table; Elasticsearch indexes device data backed by PostgreSQL
- **No upstream dependencies** (this is the first phase)
