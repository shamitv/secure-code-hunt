# Phase 01: PostgreSQL Wiring + Core Migrations

## Goal

Replace the in-memory `InMemoryStore` with a real PostgreSQL database. Create SQL migration scripts, install and configure the `pg` client, rewrite all three repositories (`UserRepository`, `SpotRepository`, `BookingRepository`) to use PostgreSQL queries, plant the A01 IDOR vulnerability on the booking endpoints, add a decoy in the same controller, and create the required `.env.example` file. Remove the unused `sqlite3` dependency.

## Scope

### Included
- [ ] Install `pg` npm package; remove `sqlite3` from `package.json`
- [ ] Create `src/config/postgres.js` — PostgreSQL connection pool
- [ ] Create `migrations/001-init.sql` — DDL for `users`, `spots`, `bookings` tables
- [ ] Create `migrations/002-seed.sql` — seed data (3 users, 4 spots, 1 sample booking)
- [ ] Add auto-migration logic to `src/app.js` — apply SQL files on startup
- [ ] Rewrite `src/repositories/UserRepository.js` — pg queries replacing in-memory array
- [ ] Rewrite `src/repositories/SpotRepository.js` — pg queries
- [ ] Rewrite `src/repositories/BookingRepository.js` — pg queries
- [ ] Remove `src/db/InMemoryStore.js` (or keep as fallback stub for Phase 1 only)
- [ ] Create `.env.example` with `DATABASE_URL`, `PORT`, `NODE_ENV`
- [ ] Plant **VULN-04 (A01)**: IDOR on `GET /api/bookings` and `GET /api/bookings/:id` — no ownership filter
- [ ] Plant **Decoy D4**: `POST /api/bookings/:id/cancel` verifies `booking.userId === req.session.userId`
- [ ] Update routes in `src/routes/bookingRoutes.js` — add new GET endpoints
- [ ] Update `.vulns` — add VULN-04 entry
- [ ] Update `README.md` chain section — note IDOR presence (not part of a chain yet)
- [ ] Update `scenarios.md` — add VULN-04 description

### Excluded
- MongoDB, Redis, Kafka, Elasticsearch wiring (Phases 2–3)
- JWT auth (Phase 4)
- Real search or event streaming
- Kafka consumer/producer refactor (Phase 3)
- UI dashboard (Phase 4)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Use `pg` (not `pg-promise` or an ORM) | Low-level driver provides raw SQL surface for IDOR vuln and parameterized decoys; no ORM abstractions that might obscure vulnerability patterns |
| Auto-migration on startup via `fs.readFileSync` | Keeps deployment simple — no separate migration tool; container starts and applies SQL in order |
| Keep cookie-based sessions for Phase 1 | Session mechanism unchanged until JWT auth in Phase 4; reduces scope |
| Remove `InMemoryStore.js` entirely | Clean break — no dual-path confusion. If issues arise, can be reverted. |
| Booking IDOR in controller, not repository | Controller-level decision to skip ownership check is more visible to detection agents; repository remains a pure data access layer |
| Decoy cancellation in same `BookingController` | Decoy D4 is adjacent to VULN-04 in the same controller — forces detection agent to distinguish two similar endpoints |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A01 | CWE-639 | `src/controllers/BookingController.js` → `listAll()`, `getById()` | `GET /api/bookings` returns all bookings; `GET /api/bookings/:id` returns any booking — no ownership verification. Exposes license plates, emails, parking history. | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| D4 | `src/controllers/BookingController.js` → `cancel()` | Same controller as IDOR endpoints; also operates on booking IDs from URL params | Verifies `booking.userId === req.session.userId` before allowing cancellation |

## Data Model Changes

### New PostgreSQL Tables

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

### Seed Data

| Table | Rows |
|-------|------|
| `users` | 3 (alice_driver, bob_driver, admin_attendant) |
| `spots` | 4 (A-101, A-102, B-201, B-202 — two Standard, two Premium) |
| `bookings` | 1 (alice_driver on A-101, 2 hours, $10) |

## API Contracts

### New Endpoints

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| GET | `/api/bookings` | Session | `BookingController.listAll()` | List all bookings (no ownership filter — **A01 IDOR**) |
| GET | `/api/bookings/:id` | Session | `BookingController.getById()` | Get booking detail (no ownership check — **A01 IDOR**) |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/bookings/book` | Replace `InMemoryStore` calls with `BookingRepository.create(pgPool, ...)` |
| POST | `/api/bookings/:id/cancel` | Replace `InMemoryStore` calls with `BookingRepository.update(pgPool, ...)`; add ownership check (**Decoy D4**) |

### Removed

| File | Reason |
|------|--------|
| `src/db/InMemoryStore.js` | Replaced by PostgreSQL |

## Artifact Updates

- `.vulns`: Add VULN-04 entry with `owasp_id: "A01"`, `severity: "medium"`, `cwe: "CWE-639"`
- `.vulns`: Add Decoy D4 entry in `decoys` array
- `README.md`: Add VULN-04 row in security benchmarking section; update tech stack to include PostgreSQL
- `scenarios.md`: Add VULN-04 description paragraph
- `.env.example`: Create with `DATABASE_URL`, `PORT`, `NODE_ENV` placeholders
- `package.json`: Remove `sqlite3` dependency; add `pg`

## Dependencies on Other Phases

- **Depends on**: None — this is the first phase
- **Required by**: Phase 2 (Redis + MongoDB share the same `server.js` and config layer), Phase 3 (Kafka consumer inserts into PostgreSQL), Phase 4 (export service queries PostgreSQL)
