# App 17 (IoT Device Dashboard) — Complexity Upgrade Expansion Plan

## Overview

Upgrade the IoT Dashboard from in-memory stubs (Map-based sessions, in-process events,
no-op search client, mock DB) to a fully wired Docker-orchestrated system with real
PostgreSQL, Redis, Redpanda (Kafka), Elasticsearch, WebSockets, and an HTML telemetry dashboard.

> **Non-goals / Constraints**
> - Do not remove or fix any existing vulnerability annotation.
> - Add 3–5 new standalone vulnerabilities covering uncovered OWASP gaps.
> - Add 1 new chained scenario (chain-02).
> - Add decoy safe code near every vulnerable path.
> - Update `.vulns`, `README.md`, `scenarios.md` each phase.

## Current State

| Property | Value |
|---|---|
| App ID | `app-17` |
| Language | JavaScript |
| Framework | Express |
| File count | ~20 source files |
| Standalone vulns | 4 (A02 ×2, A05, A10) |
| Chain scenarios | 1 (chain-01, 3 steps, impact: lateral_movement) |
| Decoys | 3 |
| OWASP gaps | A01, A03, A04, A06, A07, A08, A09 |
| Docker Compose | Exists with PostgreSQL, Redis, Redpanda, Elasticsearch (all declared but unused by app code) |
| MVC structure | In place (controllers, services, repositories, routes) |

## Architecture Changes

### Selected Components

| Component | Technology | Current State | Target State | Vuln Target |
|---|---|---|---|---|
| Relational DB | PostgreSQL 16 | InMemoryStore (mock) | Real `pg` connection + schema + migrations | A03 (SQLi), A01 (IDOR) |
| Cache | Redis 7 | SessionCache (in-memory Map) | Real `ioredis` connection | — (no new vuln; infrastructure wiring only) |
| Message Queue | Redpanda v24.1 (Kafka API) | In-process EventProducer/Consumer | Real `kafkajs` consumer + producer | A08, A09 |
| Search Engine | Elasticsearch 8 | No-op DeviceSearchClient | Real `@elastic/elasticsearch` indexing + query | A03 (query DSL injection) |
| Real-time | WebSocket (`ws`) | Not implemented | Live telemetry broadcast + HTML dashboard | A07 |

### Rejected Components

| Component | Reason |
|---|---|
| File Storage (MinIO/S3) | No upload/attachment domain need in an IoT monitoring dashboard |
| Batch Scheduler | No scheduled-task domain — telemetry is streamed, not batched |
| Second Service (microservice split) | Already wiring 5 infra components; additional service adds complexity without proportional benchmark value |
| Separate UI App (React/SPA) | HTML dashboard served from Express is sufficient for benchmark needs |

### Randomization Roll (retrospective)

Components selected: PostgreSQL, Redis, Redpanda, Elasticsearch, WebSocket = 5 components.
All five were pre-determined by the original flat plan. Documented here for traceability.
Pool after domain filtering: 8 eligible (File Storage, Batch Scheduler, and Second Service rejected).
Rationale: IoT dashboard naturally maps to telemetry streaming (Redpanda), time-series queries (PostgreSQL),
session caching (Redis), log search (Elasticsearch), and live dashboards (WebSocket).

## Vulnerability Planting Strategy

### Severity Fix Required

The standalone A10 (SSRF in `RefreshService.js`) is rated `high` in `.vulns` but `medium` in the
chain-01 component table. Per AGENTS.md chain rules, each step must be individually `low` or `medium`.
**Action**: Downgrade standalone A10 severity from `high` to `medium` in `.vulns`.

### New Vulnerabilities

| Phase | # | OWASP | CWE | Component | Location | Method | Description | Severity |
|---|---|---|---|---|---|---|---|---|
| 1 | VULN-05 | A03 | CWE-89 | PostgreSQL | `src/services/TelemetryQueryService.js` (new) | `queryTelemetry()` | Raw SQL filter string concatenation into telemetry SELECT | medium |
| 1 | VULN-06 | A01 | CWE-639 | PostgreSQL | `src/controllers/DeviceController.js` | `getDeviceTelemetry()` | Device telemetry endpoint returns data without ownership check | medium |
| 2 | VULN-07 | A08 | CWE-94 | Redpanda | `src/consumers/TelemetryConsumer.js` (new) | `processMessage()` | Consumer uses `eval()` on device config payloads from Kafka topic | medium |
| 2 | VULN-08 | A09 | CWE-778 | Redpanda | `src/consumers/TelemetryConsumer.js` (new) | `processMessage()` | No audit logging for device command/telemetry event processing | low |
| 3 | VULN-09 | A07 | CWE-306 | WebSocket | `src/ws/telemetryServer.js` (new) | `onConnection()` | WebSocket accepts connections without authentication token validation | medium |
| 3 | VULN-10 | A03 | CWE-89 | Elasticsearch | `src/services/DiagnosticsService.js` (new) | `searchLogs()` | Raw string concatenation into Elasticsearch query DSL | medium |

### New Chain: chain-02

| Field | Value |
|---|---|
| Chain ID | chain-02 |
| Name | IDOR Telemetry Access → SQL Injection → Database Exfiltration |
| Steps | 2 |
| Impact | `db_exfiltration` |

| Step | OWASP | CWE | Severity | Location | Method | Description |
|---|---|---|---|---|---|---|
| 1 | A01 | CWE-639 | medium | `src/controllers/DeviceController.js` | `getDeviceTelemetry()` | Device telemetry endpoint doesn't verify device ownership |
| 2 | A03 | CWE-89 | medium | `src/services/TelemetryQueryService.js` | `queryTelemetry()` | Telemetry filter concatenates raw SQL — attacker injects UNION SELECT to dump users/devices tables |

**Attack narrative**: An authenticated user sends `GET /api/devices/1/telemetry?filter=1; UNION SELECT username,passwordHash FROM users--`. The IDOR (step 1) allows reading any device's telemetry without ownership verification. The SQL injection (step 2) in the filter parameter dumps user credentials and device secrets from the database.

**Decoy per step**:
- Step 1 decoy: `GET /api/devices/:id` returns only `id`, `name`, `status` — intentionally strips `deviceSecret`.
- Step 2 decoy: A separate telemetry endpoint `GET /api/devices/:id/telemetry/range?from=...&to=...` uses parameterized queries for timestamp filtering.

### Decoy Placement Rules

For every new vulnerable code path:
1. Place a decoy safe pattern **in the same file** or **in an adjacent file in the same directory**
2. The decoy must accept similar inputs but apply proper validation, parameterization, or auth checks
3. Document every decoy in `.vulns.decoys` and in the phase plan

## Phase Summary

| Phase | Title | Scope | New Vulns | New Chain Steps |
|---|---|---|---|---|
| 1 | Infrastructure Wiring + Data Migration | Wire PostgreSQL + Redis; create schema/migrations; replace InMemoryStore; plant A03 SQLi + A01 IDOR | A03, A01 | — |
| 2 | Event Streaming + Search Integration | Wire Redpanda + Elasticsearch; replace in-process stubs with real consumers/search; plant A08 + A09; add chain-02 | A08, A09 | chain-02 (2 steps) |
| 3 | Real-time Dashboard + WebSocket | Add `ws` server; build HTML telemetry dashboard with charts; plant A07; add A03 ES DSL injection | A07, A03 | — |
| 4 | Verification + Metadata + Eval | Exploitability testing; metadata sync; severity fix; hint leakage scan; eval-report.md; docker compose smoke test | — | — |

## API Endpoint Inventory (post-upgrade)

| Method | Path | Auth | Description | New? |
|---|---|---|---|---|
| POST | `/api/auth/register` | None | User registration | Existing |
| POST | `/api/auth/login` | None | User login (session cookie) | Existing |
| POST | `/api/auth/logout` | Session | User logout | Existing |
| GET | `/api/health` | None | Health check | Existing |
| POST | `/api/devices/command` | Session | Send command to device | Existing |
| POST | `/api/devices/refresh` | Session | Refresh device status via URL (SSRF vuln) | Existing |
| GET | `/api/devices/:id` | Session | Public device detail (no secrets) | Existing |
| GET | `/api/devices/:id/telemetry` | Session | Device telemetry history (IDOR vuln) | **New (Phase 1)** |
| POST | `/api/devices/:id/telemetry/query` | Session | SQL filter on telemetry (SQLi vuln) | **New (Phase 1)** |
| GET | `/api/devices/:id/telemetry/range` | Session | Timestamp-range telemetry query (decoy — parameterized) | **New (Phase 1)** |
| GET | `/api/internal/telemetry` | Token | Internal telemetry dump (plaintext tokens) | Existing |
| GET | `/api/diagnostics/search` | Session | Elasticsearch device log search (DSL injection vuln) | **New (Phase 3)** |
| WS | `/ws/telemetry` | None | Live device telemetry stream (unauth vuln) | **New (Phase 3)** |

## Data Model Changes

### New PostgreSQL Tables

```sql
-- Users table (migrates from InMemoryStore.users)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER'
);

-- Devices table (migrates from InMemoryStore.devices)
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
  device_secret VARCHAR(255) NOT NULL  -- VULNERABILITY A02: plaintext storage
);

-- Telemetry time-series table
CREATE TABLE telemetry_streams (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id),
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_device_time ON telemetry_streams(device_id, recorded_at);
```

### Seed Data

- 2 users: `alice_owner` / `alice123` (CUSTOMER), `admin_iot` / `adminSecureIoT2026!` (ADMIN)
- 2 devices: Smart Thermostat (secret: `IOT-DEV-KEY-THERMO-1122`), Security Gateway (secret: `IOT-DEV-KEY-GATEWAY-8877`)
- 10 mock telemetry records across both devices

### New Elasticsearch Index Mapping

```json
{
  "mappings": {
    "properties": {
      "device_id": { "type": "integer" },
      "event_type": { "type": "keyword" },
      "message": { "type": "text" },
      "timestamp": { "type": "date" }
    }
  }
}
```

## Security Benchmark Considerations

- **Severity fix**: Downgrade standalone A10 from `high` to `medium` to match chain-01 step 2 classification.
- **Annotation migration**: When `InMemoryStore.js` is replaced by PostgreSQL, move VULN A02 annotation to the SQL schema or repository layer.
- **Decoy proximity**: Every new vulnerable code path must have a decoy within the same or adjacent file.
- **Metadata synchronization**: `.vulns`, README chain section, and source annotations must agree on OWASP ID, severity, CWE, impact, location, and method.
- **`.vulns` updates**: Add new standalone vulns to `vulnerabilities[]`, new chain to `chained_attacks[]`, new decoys to `decoys[]`.
