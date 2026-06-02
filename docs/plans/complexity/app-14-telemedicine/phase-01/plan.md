# Phase 01: Infrastructure Update + PostgreSQL Migration

## Goal

Wire real PostgreSQL as the primary database, migrate users and appointments from `InMemoryMedicalDatabase` to proper tables, add MongoDB to docker-compose, and create `.env.example`. All existing vulnerabilities and chain links must be preserved verbatim.

## Scope

### Included
- Add npm dependencies: `pg`, `mongodb`, `redis` (`ioredis`), `kafkajs`, `@elastic/elasticsearch`
- Create `src/config/db.ts` (PostgreSQL connection pool)
- Create SQL migration script: `src/db/migrations/001_init.sql`
- Create seed data SQL: `src/db/seeds/001_users_appointments.sql`
- Add MongoDB service to `docker-compose.yml` with healthcheck
- Rewrite `UserRepository.ts` to query PostgreSQL (preserve BCrypt hashing)
- Rewrite `AppointmentRepository.ts` to query PostgreSQL
- Remove `InMemoryMedicalDatabase.ts` (all data now in PG)
- Update `src/app.ts` to inject PG pool, add MongoDB wait
- Create `.env.example`
- Preserve ALL existing vulnerability annotations and chain link comments

### Excluded
- Redis wiring (Phase 2)
- Kafka wiring (Phase 3)
- Elasticsearch wiring (Phase 4)
- New vulnerabilities (Phase 2+)
- New endpoints (Phase 2+)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Use `pg` (not `pg-promise`) for direct queries | Simple, matches existing repository pattern |
| Run migrations via application startup | No migration tooling dependency |
| Keep `bcryptjs` for password hashing | Preserves DECOY-01 |
| MongoDB as separate service in compose | Used in Phase 4 for clinical notes |
| Schema matches existing models closely | Minimizes code changes in controllers/services |

## Vulnerability Planting

None in this phase — infrastructure migration only. Existing vulnerabilities preserved as-is.

## Decoy Patterns

None new in this phase — existing decoys preserved.

## Data Model Changes

### New PostgreSQL Tables

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL DEFAULT '09:00-09:30',
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  doctor_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Artifact Updates

- `.env.example`: Created with DATABASE_URL, REDIS_URL, MONGO_URI, KAFKA_BROKERS, PATIENT_SEARCH_URL, JWT_SECRET
- `.vulns`: No changes yet
- `README.md`: No changes yet
- `docker-compose.yml`: Add MongoDB service

## Dependencies on Other Phases

- **Required by**: Phase 2 (needs PG for schedule validation queries)
- **Required by**: Phase 3 (needs PG for prescription_log table)
- **Required by**: Phase 4 (needs MongoDB service)
