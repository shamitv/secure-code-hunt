# App 36 (Parking Management System) — Complexity Upgrade Expansion Plan

## Overview

Upgrade the Parking Management System from an in-memory Express monolith to a polyglot-persistence, event-driven architecture orchestrated via Docker Compose. Wire real PostgreSQL, MongoDB, Redis, Kafka/Redpanda, and Elasticsearch backends; add 4 new standalone vulnerabilities and 2 new cross-boundary chained attack scenarios; restructure the codebase into a modular MVC + event-driven layout.

> **Non-goals / Constraints**
> - Do not remove or fix any existing planted vulnerability.
> - Do not remove or weaken any existing decoy safe pattern.
> - Add 1–2 new standalone vulnerabilities per work phase.
> - Add decoy safe code near every vulnerable code path.
> - Update `.vulns`, `README.md`, and `scenarios.md` each phase.
> - Ensure every chain crosses at least two distinct code packages and crosses a process/network/DB boundary.

---

## Current State

| Property | Value |
|----------|-------|
| App ID | `app-36` |
| Language | JavaScript |
| Framework | Express 4.19 |
| File count | 11 source files |
| Standalone vulns | 3 (A03, A04, A09) |
| Chain scenarios | 1 (chain-01, 3 steps, `data_modification`) |
| Decoys | 3 |
| OWASP gaps | A01, A02, A05, A06, A07, A08, A10 |
| Data store | In-memory arrays (`InMemoryStore`) |
| Docker Compose | Exists with 5 services — **none wired to application code** |
| Event system | Synchronous in-process mock (`EventProducer` → `EventConsumer` via direct call) |
| Search | Mock Elasticsearch client filtering in-memory arrays |
| `.env.example` | Missing |

---

## Architecture Changes

### Selected Components

| Component | Technology | Vulnerability Target |
|-----------|-----------|---------------------|
| Relational DB | PostgreSQL 16 | A01 (IDOR on booking queries), parameterized-query decoys |
| Document DB | MongoDB 7 | A01 (cross-DB IDOR in export), A04 (inconsistent validation between stores) |
| Cache | Redis 7 | A02 (plaintext session data), A05 (exposed internal host via debug leak), chain-02 SSRF pivot target |
| Message Queue | Redpanda/Kafka (via `kafkajs`) | Chain-01 async boundary (HTTP → Kafka → consumer), chain-02 SSRF target |
| Search Engine | Elasticsearch 8 | A03 (query DSL injection) |
| Batch Scheduler | `node-cron` | chain-03 step 3 (scheduled export endpoint with cross-DB IDOR) |

### Rejected Components

| Component | Reason |
|-----------|--------|
| WebSocket | Parking spot vacancy can be poll-based; real-time push not needed for admin dashboard |
| Separate UI App (React/Vue SPA) | Admin dashboard served as static EJS templates within Express — single container is sufficient for benchmark scope |
| File Storage (MinIO/S3) | Photo import fetches remote URLs — no local upload storage needed for vulnerability planting |
| Second Microservice | Adds deployment complexity without new vulnerability classes beyond what Kafka consumer + cron already provides |

### Component Rationale

- **PostgreSQL** replaces in-memory arrays for users, spots, and bookings — enables SQL-based IDOR exploits and parameterized-query decoys.
- **MongoDB** stores parking lot layout geometries and dynamic pricing rules — flexible document schemas suit zone coordinates and localized holiday/peak-hour overrides. Creates cross-DB IDOR opportunity when export joins Postgres ↔ MongoDB.
- **Redis** caches session tokens and parking spot vacancy counts — exposes plaintext session data for A02 and serves as SSRF pivot target when its internal hostname is leaked via A05 debug endpoint.
- **Kafka** decouples booking submission from persistence — creates an async boundary that chain-01 must cross. Its internal broker hostname is exposed via debug leak for chain-02 SSRF.
- **Elasticsearch** powers the `/api/spots/search` endpoint with real query DSL — carries forward the A03 query-string injection.
- **node-cron** triggers the scheduled booking export job — enables cross-DB IDOR (Postgres bookings joined with MongoDB user profiles) in chain-03 step 3, decoupled from a real-time request context.

---

## Vulnerability Planting Strategy

| Phase | New OWASP | Type | Component | Description |
|-------|-----------|------|-----------|-------------|
| 1 | A01 | Standalone | PostgreSQL | IDOR — `GET /api/bookings` and `GET /api/bookings/:id` return any user's records regardless of session ownership |
| 2 | A05 | Standalone | Debug endpoint | Unauthenticated `GET /api/admin/debug` returns internal service URLs (DB, Redis, Kafka, ES) |
| 3 | A10 | Standalone | Photo import | SSRF — `POST /api/spots/:id/photo` fetches user-supplied `imageUrl` without hostname validation |
| 3 | — | Chain remodel | Kafka | Remodel chain-01 to cross HTTP → Kafka Producer → Kafka Consumer (3 files, async boundary) |
| 4 | A02 | Standalone | JWT config | Hardcoded JWT secret in `appConfig.js` enables offline token forgery |
| 4 | A07 | Chain link | Auth middleware | Weak JWT validation — verifies signature only, ignores `sub`/`role` claims |
| 4 | — | Chain new | MongoDB + PostgreSQL | chain-03: A02 (hardcoded JWT) → A07 (weak validation) → A01 (cross-DB IDOR in export) → `db_exfiltration` |

---

## Phase Summary

| Phase | Title | Scope | New Vulns | New Chains |
|-------|-------|-------|-----------|------------|
| 1 | PostgreSQL Wiring + Core Migrations | `pg` client, migrations, refactored repositories, booking IDOR, `.env.example`, remove `sqlite3` stub | 1 (A01) | — |
| 2 | Redis + MongoDB Wiring | Redis session cache, MongoDB lot layouts, debug endpoint, cross-DB decoy | 1 (A05) | — |
| 3 | Kafka + Elasticsearch Wiring | `kafkajs` producer/consumer, real ES client, SSRF photo import, remodel chain-01 across async boundary | 1 (A10) | chain-02 (A05→A10, `lateral_movement`) |
| 4 | JWT Auth + Admin UI + Export | JWT login, hardcoded secret, weak validation, export service, admin dashboard, chain-03 | 1 (A02) + chain-03 steps | chain-03 (A02→A07→A01, `db_exfiltration`) |
| 5 | Verification + Evaluation | Integration tests, Docker smoke tests, `eval-report.md` (difficulty + hint leakage) | — | — |

---

## Data Model Changes

### PostgreSQL (new — replaces InMemoryStore)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  license_plate VARCHAR(20),
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  spot_number VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  price_rate NUMERIC(8,2) NOT NULL,
  floor INTEGER DEFAULT 0,
  is_accessible BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  spot_id INTEGER REFERENCES spots(id),
  start_time TIMESTAMP DEFAULT NOW(),
  duration_hours NUMERIC(5,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB (new)

```js
// lot_layouts collection
{
  lotId: "A-101",
  zone: "Level-1-North",
  spotCoordinates: { x: 12, y: 34 },
  vehicleRestrictions: { maxHeightCm: 210, maxWeightKg: 2500, evOnly: false },
  rules: [
    { rule: "no_overnight", effectiveTime: "22:00-06:00" }
  ]
}

// pricing_rules collection
{
  ruleType: "peak_hour",
  effectiveDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  effectiveHours: { start: "08:00", end: "10:00" },
  multiplier: 1.5,
  restrictions: { minDurationHours: 1 }
}
```

### Redis (new)

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `session:<token>` | `JSON.stringify({ userId, username, role })` | 24h |
| `spot:<id>:vacancy` | integer | None |
| `rate-limit:<ip>:login` | integer | 15 min |

### Elasticsearch (new)

- Index: `parking-spots`
- Document fields: `id`, `spotNumber`, `type`, `priceRate`, `floor`, `isAccessible`, `zone`, `restrictions`

---

## API Endpoint Inventory

### Existing (carry forward)

| Method | Path | Auth | Description | Vuln / Chain |
|--------|------|------|-------------|-------------|
| POST | `/api/auth/register` | None | Register new user | — |
| POST | `/api/auth/login` | None | Session-based login | — |
| POST | `/api/auth/logout` | Session | Destroy session | — |
| GET | `/api/health` | None | Health check (no internal detail) | — |
| GET | `/api/spots/search` | None | Search spots | A03 (ES injection), chain-01 step 1 |
| GET | `/api/spots/:id` | None | Spot detail | — |
| POST | `/api/admin/spots` | Session (Admin) | Create spot | — |
| POST | `/api/bookings/book` | Session | Create booking | A04 (client pricing), chain-01 step 2 |
| POST | `/api/bookings/:id/cancel` | Session | Cancel booking | A09 (missing audit), chain-01 step 3 |

### New — Phase 1

| Method | Path | Auth | Description | Vuln / Chain |
|--------|------|------|-------------|-------------|
| GET | `/api/bookings` | Session | List all bookings (no ownership filter) | A01 (IDOR) |
| GET | `/api/bookings/:id` | Session | Get booking detail (no ownership check) | A01 (IDOR) |

### New — Phase 2

| Method | Path | Auth | Description | Vuln / Chain |
|--------|------|------|-------------|-------------|
| GET | `/api/admin/debug` | **None** | Returns internal DB/Redis/Kafka/ES URLs | A05 (debug leak), chain-02 step 1 |
| POST | `/api/admin/layouts` | Session (Admin) | Create MongoDB lot layout document | — |
| GET | `/api/spots/:id/layout` | None | Get lot layout from MongoDB | — |

### New — Phase 3

| Method | Path | Auth | Description | Vuln / Chain |
|--------|------|------|-------------|-------------|
| POST | `/api/spots/:id/photo` | Session (Admin) | Import photo from user-supplied URL | A10 (SSRF), chain-02 step 2 |

### New — Phase 4

| Method | Path | Auth | Description | Vuln / Chain |
|--------|------|------|-------------|-------------|
| POST | `/api/auth/jwt-login` | None | Returns JWT token (hardcoded secret) | A02, chain-03 step 1 |
| GET | `/api/admin/exports/bookings` | Session/JWT | Export booking report (joins PG + Mongo) | A01 (cross-DB IDOR), chain-03 step 3 |
| GET | `/api/admin/dashboard` | Session/JWT | Admin dashboard page (EJS templates) | — |

---

## Security Benchmark Considerations

### Decoy Placement Rule
Every vulnerable endpoint must have a decoy safe endpoint or function in the same file or an adjacent file in the same directory. Decoys must accept similar inputs but apply proper validation, parameterization, or auth checks.

### Annotation Rule
- Standalone vulns: `// VULNERABILITY <OWASP_ID>: <brief description>`
- Chain links: `// CHAIN LINK <N> (chain-<ID>): <description>`
- Decoys: document in `.vulns.decoys` only (no source comment for decoys)

### Metadata Synchronization
`.vulns`, `README.md` chain section, `scenarios.md`, and source annotations must agree on OWASP ID, severity, CWE, impact, location, and method after every phase.

### Cross-Boundary Chain Rule
Every chain scenario must span at least two distinct code packages (controllers, services, consumers, config, middleware) and must cross a process/network/DB boundary — no chain may have all steps in a single file.

### Existing Code Preservation
The three existing standalone vulnerabilities (A03, A04, A09) and chain-01 must remain exploitable after the upgrade. Their code paths may be refactored (e.g., wiring real ES instead of mock), but the vulnerability logic must survive intact.
