# Phase 01 Status Report — app-36 Parking Management System

## Summary
- **Phase**: PostgreSQL Wiring + Core Migrations
- **Files created**: 5 (`.env.example`, `src/config/postgres.js`, `src/config/migrate.js`, `migrations/001-init.sql`, `migrations/002-seed.js`)
- **Files modified**: 9 (`package.json`, `src/config/appConfig.js`, `src/repositories/UserRepository.js`, `src/repositories/SpotRepository.js`, `src/repositories/BookingRepository.js`, `src/services/AuthService.js`, `src/services/BookingService.js`, `src/services/SpotService.js`, `src/controllers/AuthController.js`, `src/controllers/BookingController.js`, `src/controllers/SpotController.js`, `src/routes/bookingRoutes.js`, `src/app.js`, `src/index.js`, `src/search/ParkingSearchClient.js`, `tests/contract.test.js`, `.vulns`, `README.md`, `scenarios.md`)
- **Files deleted**: 2 (`src/db/InMemoryStore.js`, `migrations/002-seed.sql`)
- **New vulnerabilities**: 1 (VULN-04 A01 IDOR)
- **New decoys**: 1 (D4 — ownership check on cancel)
- **Chains advanced**: chain-01 kept intact with existing steps

## Verification
- Existing vulnerabilities intact: PASS
- New vulnerabilities exploitable: PASS (VULN-04 via `GET /api/bookings` and `GET /api/bookings/:id`)
- Decoys present: PASS
- `.vulns` updated: PASS
- README updated: PASS
- scenarios.md updated: PASS
- Contract tests passing: PASS

## Changes Made

### Files Created
- `.env.example`
- `src/config/postgres.js`
- `src/config/migrate.js`
- `migrations/001-init.sql`
- `migrations/002-seed.js`

### Vulnerabilities Planted
- VULN-04 (A01): `src/controllers/BookingController.js` → `listAll(), getById()` — IDOR on booking list and detail endpoints

### Blockers
- None
