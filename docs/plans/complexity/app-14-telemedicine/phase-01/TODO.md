# Phase 01 TODO — Infrastructure + PostgreSQL Migration

## Pre-requisites
- [ ] Read vuln-inventory.md — confirm no-touch files
- [ ] Confirm docker-compose.yml currently has PostgreSQL (yes — unused)
- [ ] Confirm no edits to TokenService.ts, AppointmentService.ts vulnerability code

## Dependencies & Config
- [ ] Add npm packages: `pg`, `mongodb`, `ioredis`, `kafkajs`, `@elastic/elasticsearch`
- [ ] Add dev types: `@types/pg`
- [ ] Create `src/config/db.ts` with PostgreSQL connection pool
- [ ] Create `.env.example` with all 7 variables

## Database Schema & Seeds
- [ ] Create `src/db/migrations/001_init.sql` (CREATE TABLE users, appointments)
- [ ] Create `src/db/seeds/001_users_appointments.sql` (seed 4 users, 2 appointments)
- [ ] Create `src/db/migrate.ts` to run migration + seeds on startup

## Repository Migration
- [ ] Rewrite `src/repositories/UserRepository.ts` to use PG pool
  - `findByUsername()` → `SELECT * FROM users WHERE username = $1`
  - `savePatient()` → `INSERT INTO users ... RETURNING id`
  - Preserve BCrypt hashing (DECOY-01)
- [ ] Rewrite `src/repositories/AppointmentRepository.ts` to use PG pool
  - `findForPatient()` → `SELECT * FROM appointments WHERE patient_id = $1`
  - `findForDoctor()` → same for doctor_id
  - `findAll()` → `SELECT * FROM appointments`
  - `findById()` → `SELECT * FROM appointments WHERE id = $1`
- [ ] Remove `src/db/InMemoryMedicalDatabase.ts`

## Docker Compose
- [ ] Add MongoDB service to `docker-compose.yml`:
  ```yaml
  mongodb:
    image: mongo:6
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 10
  ```
- [ ] Add `mongodb` to web service `depends_on` with `condition: service_healthy`
- [ ] Add `MONGO_URI=mongodb://mongodb:27017/telemed_clinical` to web environment

## App Wiring
- [ ] Update `src/app.ts`:
  - Import PG pool from `src/config/db.ts`
  - Pass pool to UserRepository and AppointmentRepository
  - Remove InMemoryMedicalDatabase import and instantiation
  - Run migrations on startup (await db pool, run SQL)
- [ ] Update `src/config/appConfig.ts`: add `mongoUri` field
- [ ] Update `Dockerfile` if needed (for seed data copy)

## Commit Cadence
- [ ] Commit after npm install + config creation:
  `git add -A && git commit -m "app-14 phase-01: add dependencies, db config, .env.example"`
- [ ] Commit after schema + seeds + repos:
  `git add -A && git commit -m "app-14 phase-01: PostgreSQL schema, seeds, repository migration"`
- [ ] Commit after docker-compose + app wiring:
  `git add -A && git commit -m "app-14 phase-01: docker-compose MongoDB, app wiring complete"`

## Verification
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Docker Compose spins up all 6 services (web, pg, redis, kafka, es, mongo)
- [ ] All existing endpoints return correct responses with PG backend:
  - `POST /api/auth/register` — new user persisted to PG
  - `POST /api/auth/login` — login succeeds
  - `GET /api/auth/me` — returns user from PG
  - `GET /api/appointments` — lists appointments from PG
  - `GET /api/appointments/1` — returns detail with doctorNotes (IDOR intact)
- [ ] Chain-01 still exploitable (forged JWT → enumerate appointments)
- [ ] All 4 existing vulnerability annotations intact
- [ ] All 3 decoy patterns intact

## Phase Status Report
- [ ] Create `phase-01/status-report.md` with:
  - Files created (count)
  - Files modified (count)
  - Existing vulns intact: yes/no
  - Build status: pass/fail
  - Docker health: pass/fail
  - Blockers: none/list
