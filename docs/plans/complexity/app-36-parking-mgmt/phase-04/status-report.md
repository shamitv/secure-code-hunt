# Phase 04 Status Report — app-36 Parking Management System

## Summary
- **Phase**: JWT Auth + Admin UI + Export Service + Chain-03
- **Files created**: 10 (`src/middleware/jwtAuth.js`, `src/middleware/adminOnly.js`, `src/services/ExportService.js`, `src/services/DynamicPricing.js`, `src/controllers/ExportController.js`, `src/routes/exportRoutes.js`, `migrations/004-mongo-user-profiles.js`, `views/dashboard.ejs`, `public/css/dashboard.css`, `src/routes/authRoutes.js` — modified)
- **Files modified**: 8 (`package.json`, `src/config/appConfig.js`, `src/controllers/AuthController.js`, `src/controllers/AdminController.js`, `src/routes/adminRoutes.js`, `src/app.js`, `tests/contract.test.js`, `.vulns`, `README.md`, `scenarios.md`)
- **New vulnerabilities**: 1 (VULN-07 A02 hardcoded JWT secret)
- **New decoys**: 2 (D7 — AuthController.refreshToken, D8 — AdminOnlyMiddleware)
- **Chains advanced**: chain-03 fully wired (A02 appConfig → A07 jwtAuth → A01 exportService)

## Verification
- Existing vulnerabilities intact: PASS
- New vulnerabilities exploitable: PASS (VULN-07 via `jwtLogin` + extracting secret from source)
- Decoys present: PASS
- `.vulns` updated: PASS
- README updated: PASS
- scenarios.md updated: PASS
- Contract tests passing: PASS

## Changes Made

### Files Created
- `src/middleware/jwtAuth.js`
- `src/middleware/adminOnly.js`
- `src/services/ExportService.js`
- `src/services/DynamicPricing.js`
- `src/controllers/ExportController.js`
- `src/routes/exportRoutes.js`
- `migrations/004-mongo-user-profiles.js`
- `views/dashboard.ejs`
- `public/css/dashboard.css`

### Vulnerabilities Planted
- VULN-07 (A02): `src/config/appConfig.js` → `(constant)` — hardcoded JWT secret `parking-mgmt-secret-key-2024`

### Chains Planted
- chain-03 (A02 → A07 → A01): All 3 steps planted across config, middleware, and export service

### Blockers
- None
