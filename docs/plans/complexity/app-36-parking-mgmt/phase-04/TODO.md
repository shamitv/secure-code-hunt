# Phase 04 TODO — JWT Auth + Admin UI + Export Service + Chain-03

## Pre-requisites
- [ ] Phases 1, 2, and 3 complete and verified
- [ ] All 6 services healthy in Docker Compose
- [ ] Kafka booking pipeline functional (bookings are created via Kafka consumer)
- [ ] MongoDB lot layouts and pricing rules populated
- [ ] Re-read `vuln-inventory.md` — confirm all existing vulns and chains intact

## Dependencies
- [ ] Add `jsonwebtoken` to `package.json` (`npm install jsonwebtoken`)
- [ ] Add `ejs` to `package.json` (`npm install ejs`)

## JWT Config + VULN-07 (A02: Hardcoded Secret)
- [ ] Update `src/config/appConfig.js`:
  - Add constant:
    ```js
    // CHAIN LINK 1 (chain-03): Hardcoded JWT secret enables offline token forgery.
    // VULNERABILITY A02: Hardcoded JWT secret allows offline token forgery.
    const JWT_SECRET = 'parking-mgmt-secret-key-2024';
    const JWT_EXPIRY = '24h';
    ```
  - **Do NOT use `process.env.JWT_SECRET || 'default'`** — the secret must be hardcoded as a module constant to remain visible in source
  - Export `JWT_SECRET`, `JWT_EXPIRY`

## JWT Auth Middleware + Chain-03 Step 2 (A07)
- [ ] Create `src/middleware/jwtAuth.js`:
  - Import `jwt` from `jsonwebtoken`
  - Import `JWT_SECRET` from `appConfig.js`
  - `verifyToken(req, res, next)`:
    ```js
    // CHAIN LINK 2 (chain-03): JWT verification trusts any token signed with the hardcoded secret.
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'no token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // VULNERABILITY: No iss, aud, sub validation; no role check against resource
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: 'invalid token' });
    }
    ```
  - **Deliberately omitted**: `issuer`, `audience`, custom claim validation, token type check
  - Export `verifyToken`

## JWT Login Endpoint
- [ ] Update `src/controllers/AuthController.js`:
  - Add `jwtLogin(req, res)`:
    - Accept `{ username, password }`
    - Lookup user in PostgreSQL via `UserRepository.findByUsername()`
    - Compare password hash with `bcrypt`
    - If valid, sign JWT: `jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY })`
    - Return `{ token }`
    - Annotate with: `// VULNERABILITY A02: JWT signed with hardcoded secret from appConfig.`
- [ ] Update `src/routes/authRoutes.js`:
  - Add `router.post('/jwt-login', authController.jwtLogin)`

## Decoy D7: Safe Token Refresh
- [ ] Add to `src/controllers/AuthController.js`:
  - `refreshToken(req, res)`:
    - Validates `req.body.refreshToken`
    - Calls `jwt.verify(refreshToken, rotatingSecretFromDb)` (simulated — read from `appConfig.ROTATING_SECRET`)
    - Validates `decoded.iss === 'parking-mgmt'`, `decoded.aud === 'api'`, `decoded.exp > now`
    - Signs new access token with rotating secret
    - **This is the decoy** — looks like it handles JWT but actually does proper validation
- [ ] Add `router.post('/auth/refresh', authController.refreshToken)` to `authRoutes.js`

## Admin Auth Guard (Unify JWT + Session)
- [ ] Update `src/middleware/adminOnly.js`:
  - Accept either session cookie (`req.session?.role === 'ADMIN'`) or JWT (`req.user?.role === 'ADMIN'`)
  - If using JWT path, the weak `verifyToken` middleware (chain-03 step 2) is what granted access
  - **Decoy D8**: Document adminOnly as correctly validating `role` field — contrast with `verifyToken` which doesn't validate claims

## Export Service + Chain-03 Step 3 (A01: Cross-DB IDOR)
- [ ] Create `src/services/ExportService.js`:
  - `exportBookingReport(pgPool, mongoDb, bookingIds)`:
    ```js
    // CHAIN LINK 3 (chain-03): Export endpoint joins PostgreSQL and MongoDB without resource-ownership check.
    // Accepts arbitrary bookingIds array from request — no check that requester owns these bookings.
    ```
    - Query PostgreSQL: `SELECT b.*, u.username, u.license_plate, u.contact_email FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ANY($1::int[])`
    - For each booking, fetch MongoDB `user_profiles` document (contains phone, address, payment info)
    - Return merged array — full PII dump
    - **No ownership filter** on `bookingIds` — attacker can request any IDs
- [ ] Create `src/controllers/ExportController.js`:
  - `exportBookings(req, res)`:
    - Accept `{ bookingIds }` from request body
    - Call `ExportService.exportBookingReport(pgPool, mongoDb, bookingIds)`
    - Return JSON dump with `200`
- [ ] Create `src/routes/exportRoutes.js`:
  - `router.get('/bookings', authMiddleware, adminOnly, exportController.exportBookings)` or
  - `router.post('/bookings', authMiddleware, adminOnly, exportController.exportBookings)` — POST since body contains `bookingIds`
  - Both JWT and session auth paths accepted via `authMiddleware`
- [ ] Register `exportRoutes` in `src/app.js`

## MongoDB User Profiles Seed
- [ ] Create `migrations/004-mongo-user-profiles.js`:
  - Insert `user_profiles` documents for all 3 seeded users:
    ```js
    { userId: 1, phone: "+1-555-0101", address: "123 Maple St, Springfield", paymentLast4: "4242" }
    { userId: 2, phone: "+1-555-0102", address: "456 Oak Ave, Springfield", paymentLast4: "5678" }
    { userId: 3, phone: "+1-555-0103", address: "789 Pine Rd, Springfield", paymentLast4: "9012" }
    ```
- [ ] Add migration to startup sequence in `src/app.js`

## DynamicPricing Service (Decoy-Safe)
- [ ] Create `src/services/DynamicPricing.js`:
  - `calculateFee(spot, durationHours, userId)`:
    - Fetches spot rate from PostgreSQL
    - Fetches active pricing rules from MongoDB (`PricingRulesService.getActiveRules()`)
    - Checks current time against rule effective windows
    - Applies multipliers for peak hours, holidays, membership level
    - Returns final calculated price
    - **This is the safe decoy** — server-side price calculation; contrasts with VULN-02 (client-controlled pricing)
  - Export `calculateFee`

## Admin Dashboard UI
- [ ] Create `views/dashboard.ejs`:
  - Parking lot vacancy grid (table of spots with status colors)
  - Rate table showing current dynamic pricing rules
  - Export form (text input for booking IDs, "Export" button)
  - Spot search bar (queries ES)
  - Minimal CSS in `<style>` block — no external framework dependency
- [ ] Create `public/css/dashboard.css`:
  - Basic grid layout, status indicators (green/yellow/red), form styling
- [ ] Update `src/controllers/AdminController.js`:
  - `dashboard(req, res)`: render `dashboard.ejs` with spot data from PostgreSQL and pricing rules from MongoDB
- [ ] Update `src/routes/adminRoutes.js`:
  - Add `router.get('/dashboard', authMiddleware, adminOnly, adminController.dashboard)`
- [ ] Configure Express to serve EJS:
  - `app.set('view engine', 'ejs')`
  - `app.set('views', path.join(__dirname, '..', 'views'))`

## Chain-03 Wiring Verification
- [ ] Verify all 3 chain-03 annotations are in place:
  - `src/config/appConfig.js` — `// CHAIN LINK 1 (chain-03): ...`
  - `src/middleware/jwtAuth.js` — `// CHAIN LINK 2 (chain-03): ...`
  - `src/services/ExportService.js` — `// CHAIN LINK 3 (chain-03): ...`
- [ ] Verify all 3 files are in different code packages: config, middleware, services
- [ ] Verify chain crosses two data stores: PostgreSQL + MongoDB

## App Factory Update
- [ ] Update `src/app.js` `createApp()`:
  - Configure EJS view engine and views directory
  - Serve static files from `public/`
  - Register `jwtAuth` middleware (available for export/dashboard routes)
  - Register new routes: `jwt-login`, `exportRoutes`
  - Inject `pgPool` and `mongoDb` into `ExportService`
  - Run MongoDB user profiles migration on startup

## Artifact Updates
- [ ] Update `.vulns`:
  - Add VULN-07: `owasp_id: "A02"`, `cwe: "CWE-798"`, `severity: "low"`, `location: "src/config/appConfig.js"`, `method: "(constant)"`, `description: "JWT secret hardcoded as module constant."`
  - Add chain-03: 3 components (step 1 appConfig, step 2 jwtAuth middleware, step 3 ExportService), `impact: "db_exfiltration"`
  - Add D7: `location: "src/controllers/AuthController.js"`, `description: "Refresh token endpoint validates issuer, audience, expiry and uses rotating secret."`
  - Add D8: `location: "src/middleware/adminOnly.js"`, `description: "Admin guard correctly validates session role with signature check."`
- [ ] Update `apps/javascript/app-36-parking-mgmt/README.md`:
  - Update "Tech Stack" — add JWT, EJS
  - Update "API Endpoints" — add jwt-login, export, dashboard
  - Add chain-03 to "Chained Vulnerability Scenario" section with full table and attack narrative
- [ ] Update `apps/javascript/app-36-parking-mgmt/scenarios.md`:
  - Add chain-03 narrative (hardcoded JWT → weak validation → cross-DB export)

## Regular Commits
- [ ] Commit cadence:
  1. `app-36 phase-04: add jsonwebtoken+ejs dependencies, plant VULN-07 (A02 hardcoded JWT)`
  2. `app-36 phase-04: create jwtAuth middleware with weak validation (chain-03 step 2)`
  3. `app-36 phase-04: add jwt-login endpoint + decoy D7 refreshToken`
  4. `app-36 phase-04: create ExportService with cross-DB IDOR (chain-03 step 3)`
  5. `app-36 phase-04: create DynamicPricing safe service + MongoDB user profiles seed`
  6. `app-36 phase-04: build admin dashboard EJS UI`
  7. `app-36 phase-04: wire chain-03, update .vulns, README, scenarios.md`

## Phase Status Report
- [ ] Create `phase-04/status-report.md`:
  - Files created / modified counts
  - VULN-07 (A02) planted
  - Chain-03 (3 steps across config/middleware/service) wired
  - Decoys D7 and D8 planted
  - DynamicPricing safe service created (contrast to A04)
  - Admin dashboard rendered at `GET /api/admin/dashboard`
  - All existing vulns (VULN-01–06) still exploitable
  - All existing chains (chain-01, chain-02) still functional
  - All existing decoys (D1–D6) still present

## Verification
- [ ] `docker compose up --build` — all 6 services healthy
- [ ] `POST /api/auth/jwt-login` with `{ username: "admin_attendant", password: "attendant2026Secure!" }` — returns JWT `{ token }`
- [ ] Decode the JWT on [jwt.io](https://jwt.io) — verify it's signed with `parking-mgmt-secret-key-2024`
- [ ] Forge a JWT offline with the secret: `{ sub: 3, username: "alice_driver", role: "ADMIN" }` → use against `/api/admin/dashboard` — access granted (chain-03 step 2: weak validation trusts any validly signed token regardless of claims)
- [ ] `GET /api/admin/exports/bookings` with forged JWT + `{ bookingIds: [1,2,3] }` — returns all booking PII including license plates, contact emails, phone numbers, addresses, payment last-4 (chain-03 step 3: cross-DB PII dump)
- [ ] `POST /api/auth/refresh` with a valid refresh token — validates iss/aud/exp claims (Decoy D7 working)
- [ ] `GET /api/admin/dashboard` — renders EJS dashboard with vacancy grid and rate table
- [ ] `DynamicPricing.calculateFee(spot2, 4, 1)` — returns correctly calculated fee (server-side, safe)
- [ ] All Phase 1-3 vulns still exploitable:
  - `GET /api/bookings` — IDOR returns all bookings (VULN-04)
  - `GET /api/admin/debug` — returns service URLs (VULN-05)
  - `GET /api/spots/search?q=*:*` — ES injection broadens results (VULN-01)
  - `POST /api/bookings/book` with `totalCost: 0` — Kafka event with zero cost (VULN-02)
  - `POST /api/bookings/:id/cancel` — no audit log emitted (VULN-03)
  - `POST /api/spots/:id/photo` with internal URL — SSRF reaches Redis (VULN-06)
- [ ] `node tests/contract.test.js` — updated and passing
- [ ] `.vulns` updated with VULN-07, chain-03, D7, D8
- [ ] `README.md` and `scenarios.md` updated with chain-03
