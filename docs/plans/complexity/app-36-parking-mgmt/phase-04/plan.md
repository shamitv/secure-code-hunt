# Phase 04: JWT Auth + Admin UI + Export Service + Chain-03

## Goal

Replace cookie-based session authentication with JWT tokens, plant the A02 hardcoded-secret vulnerability and A07 weak-token-validation vulnerability, build the admin dashboard UI, implement the cross-DB booking export service, and wire chain-03 (hardcoded JWT → weak validation → cross-DB IDOR → `db_exfiltration`). This phase adds the most complex chain in the benchmark — spanning config, middleware, and a service that joins two databases.

## Scope

### Included
- [ ] Install `jsonwebtoken` npm package
- [ ] Plant **VULN-07 (A02)**: Hardcoded JWT secret in `src/config/appConfig.js`
- [ ] Create `src/middleware/jwtAuth.js` — JWT verification middleware
- [ ] Plant chain-03 step 2 (A07): JWT middleware validates signature only, ignores `sub`/`role` claims
- [ ] Create `POST /api/auth/jwt-login` endpoint — returns JWT token
- [ ] Add JWT auth guard to admin routes (works alongside existing session auth)
- [ ] Create `src/services/ExportService.js` — joins PostgreSQL bookings with MongoDB user profiles
- [ ] Plant chain-03 step 3 (A01): Export endpoint accepts arbitrary `bookingIds[]` — returns cross-DB PII dump
- [ ] Create `GET /api/admin/exports/bookings` endpoint — cross-DB IDOR
- [ ] Create `GET /api/admin/dashboard` — admin EJS dashboard page
- [ ] Create `src/services/DynamicPricing.js` — membership-aware pricing calculations (decoy, not vuln)
- [ ] Plant **Decoy D7**: `AuthController.refreshToken()` — validates full JWT claims with rotating secret
- [ ] Plant **Decoy D8**: `middleware/adminOnly.js` — properly verifies session role
- [ ] Wire chain-03: A02 (config) → A07 (middleware) → A01 (export service)
- [ ] Update `.vulns` — add VULN-07, chain-03 entries
- [ ] Update `README.md`, `scenarios.md`

### Excluded
- Real-time WebSocket dashboard (excluded per architecture decisions)
- Separate React/Vue SPA (admin UI is EJS-rendered within Express)
- Additional microservice split (single Express process sufficient)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| JWT + session coexisting | Existing endpoints keep cookie-based sessions (avoids breaking Phase 1-3 vulns). New admin endpoints accept either. Chain-03 uses JWT path. |
| Hardcoded secret as module constant | Must be visible in source/config — enables offline token forgery. Not read from environment. |
| `jsonwebtoken` library (`jwt.sign` / `jwt.verify`) | Standard library. Weakness is in how we call `verify()` — no `issuer`, `audience`, or custom claim checks. |
| Export service joins Postgres + MongoDB | The cross-DB join is the chain-03 step 3 surface. The service deliberately accepts a flat array of booking IDs and returns full PII. |
| EJS dashboard, not React/Vue | Single Express container — no separate frontend build step. Dashboard displays vacancy grid, rate table, and export form. |
| `DynamicPricing.js` as decoy-safe service | Calculates price server-side from spot rate × duration × membership multiplier. Provides contrast to client-controlled pricing (VULN-02 / A04). |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A02 | CWE-798 | `src/config/appConfig.js` | `JWT_SECRET = 'parking-mgmt-secret-key-2024'` — hardcoded, never rotated, visible in source | Low |

## Chain Planting

### chain-03 — Hardcoded JWT → Weak Token Validation → Cross-DB IDOR → `db_exfiltration`

| Step | OWASP | Severity | Location | Method | Description |
|------|-------|----------|----------|--------|-------------|
| 1 | A02 | Low | `src/config/appConfig.js` | (constant) | `JWT_SECRET` hardcoded in config — attacker extracts it from source or stack trace. |
| 2 | A07 | Medium | `src/middleware/jwtAuth.js` | `verifyToken()` | JWT middleware calls `jwt.verify(token, secret)` with no `issuer`, `audience`, or custom claim validation. Any token signed with the hardcoded secret is trusted. |
| 3 | A01 | Medium | `src/services/ExportService.js` | `exportBookingReport()` | `GET /api/admin/exports/bookings` accepts arbitrary `{ bookingIds }` array, joins PostgreSQL bookings with MongoDB user profiles, returns full PII dump with no resource-ownership check. |

**Annotations**:
- Step 1: `// CHAIN LINK 1 (chain-03): Hardcoded JWT secret enables offline token forgery.`
- Step 2: `// CHAIN LINK 2 (chain-03): JWT verification trusts any token signed with the hardcoded secret.`
- Step 3: `// CHAIN LINK 3 (chain-03): Export endpoint joins PostgreSQL and MongoDB without resource-ownership check.`

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| D7 | `src/controllers/AuthController.js` → `refreshToken()` | Same file as JWT login handler; also manipulates JWT tokens | Validates `iss`, `aud`, `exp` claims and fetches rotating secret from a database-backed keystore (simulated for benchmark) |
| D8 | `src/middleware/adminOnly.js` | Same directory as `jwtAuth.js`; also performs auth checks | Properly verifies `req.session.role === 'ADMIN'` with session signature validation |

## Data Model Changes

### Export Service Query Pattern

```js
// cross-DB join: PostgreSQL bookings + MongoDB user profiles
async function exportBookingReport(pgPool, mongoDb, bookingIds) {
  // 1. Query PostgreSQL for bookings (no ownership filter — IDOR)
  const bookings = await pgPool.query(
    'SELECT b.*, u.username, u.license_plate, u.contact_email ' +
    'FROM bookings b JOIN users u ON b.user_id = u.id ' +
    'WHERE b.id = ANY($1::int[])',  // parameterized, but ANY booking id accepted
    [bookingIds]
  );

  // 2. Enrich with MongoDB user profile data
  const enriched = [];
  for (const b of bookings.rows) {
    const profile = await mongoDb.collection('user_profiles')
      .findOne({ userId: b.user_id });
    enriched.push({ ...b, mongoProfile: profile });
  }
  return enriched;
}
```

### Admin Dashboard EJS Views

- `views/dashboard.ejs` — vacancy grid, rate table, export form, spot search bar
- `views/partials/header.ejs` — navigation
- `public/css/dashboard.css` — basic styling (no framework dependency)

### New Seed Data

- `migrations/004-mongo-user-profiles.js`: insert `user_profiles` collection documents for all 3 users with extra PII (phone numbers, address history, payment method last 4)

## API Contracts

### New Endpoints

| Method | Path | Auth | Handler | Description | Vuln / Chain |
|--------|------|------|---------|-------------|-------------|
| POST | `/api/auth/jwt-login` | None | `AuthController.jwtLogin()` | Accepts `{ username, password }`, returns `{ token }` signed with hardcoded secret | A02, chain-03 step 1 |
| GET | `/api/admin/exports/bookings` | JWT/Session | `ExportController.exportBookings()` | Accepts `{ bookingIds }` array; returns cross-DB PII dump | A01 (cross-DB IDOR), chain-03 step 3 |
| GET | `/api/admin/dashboard` | JWT/Session | `AdminController.dashboard()` | Renders admin dashboard EJS page | — |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| All `POST /api/admin/*` | — | Now accept either `Authorization: Bearer <jwt>` or session cookie |
| `POST /api/auth/login` | — | Keep session-based response (backward compatibility with Phase 1-3 vulns) |

## Artifact Updates

- `.vulns`: Add VULN-07 (A02); add chain-03 (3 steps, `db_exfiltration` impact); add D7, D8 decoys
- `README.md`: Update "Chained Vulnerability Scenario" section — add chain-03 table; update API endpoints; update tech stack with JWT
- `scenarios.md`: Add chain-03 attack narrative
- `package.json`: Add `jsonwebtoken`, `ejs` dependencies
- `docker-compose.yml`: No changes (no new service)

## Dependencies on Other Phases

- **Depends on**: Phase 1 (PostgreSQL repositories), Phase 2 (MongoDB wired, debug endpoint created), Phase 3 (Kafka/ES wired — booking data flows through Kafka into PostgreSQL)
- **Required by**: Phase 5 (final verification — all vulns and chains must be in place for evaluation)
