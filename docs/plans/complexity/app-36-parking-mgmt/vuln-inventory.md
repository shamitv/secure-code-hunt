# Vulnerability Inventory — App 36 (Parking Management System)

## Purpose

This document catalogs every existing and planned vulnerability, chain scenario, and decoy pattern for app-36. It serves as the **no-touch zone reference** — no implementation phase may remove, fix, or weaken any item listed here. New vulnerabilities planted during the complexity upgrade must be appended to this inventory in each phase status report.

---

## App Profile

| Property | Value |
|----------|-------|
| App ID | `app-36` |
| Name | Parking Management System |
| Language | JavaScript |
| Framework | Express 4.19 |
| Source root | `apps/javascript/app-36-parking-mgmt/src/` |
| Entry point | `src/index.js` |
| App factory | `src/app.js` → `createApp()` |

---

## Standalone Vulnerabilities

### VULN-01 — A03: Elasticsearch Query DSL Injection

| Field | Value |
|-------|-------|
| OWASP ID | A03 |
| CWE | CWE-74 |
| Severity | high |
| Location | `src/search/ParkingSearchClient.js` |
| Method | `searchByQueryString()` |
| Line range | 7–31 |
| Annotation | `// VULNERABILITY A03: Elasticsearch query injection can broaden spot searches and reveal pricing.` |
| Description | User-supplied query strings are concatenated directly into an Elasticsearch `query_string` clause without sanitization. An attacker can inject JSON DSL constructs to bypass filters, expose hidden spots, or retrieve all indexed documents. |
| Exploit vector | `GET /api/spots/search?q=* OR *:*` or `GET /api/spots/search?q=foo" OR "match_all":{}//` |
| Phase impact | Phase 3 — mock ES client replaced with real `@elastic/elasticsearch` client; injection surface preserved |

### VULN-02 — A04: Client-Controlled Pricing

| Field | Value |
|-------|-------|
| OWASP ID | A04 |
| CWE | CWE-20 |
| Severity | medium |
| Location | `src/services/BookingService.js` |
| Method | `book()` |
| Line range | 8–21 |
| Annotation | `// VULNERABILITY A04: Client-controlled totalCost permits zero or negative cost bookings.` |
| Description | The booking endpoint accepts `totalCost` directly from the request body without recalculating from the spot's hourly rate and the requested duration. An attacker can set `totalCost` to `0` or a negative value. |
| Exploit vector | `POST /api/bookings/book` with `{ spotId: <premium_id>, durationHours: 48, totalCost: 0 }` |
| Phase impact | Phase 3 — booking flow refactored to publish Kafka event; `totalCost` passed through event payload unchecked |

### VULN-03 — A09: Missing Security Audit Logs

| Field | Value |
|-------|-------|
| OWASP ID | A09 |
| CWE | CWE-778 |
| Severity | low |
| Location | `src/services/BookingService.js` |
| Method | `cancel()` |
| Line range | 24–36 |
| Annotation | `// VULNERABILITY A09: Critical booking mutations lack audit logging.` |
| Description | Booking cancellations are persisted to the data store without generating any security audit event or log entry. There is no record of who cancelled which booking or when. |
| Exploit vector | `POST /api/bookings/:id/cancel` — successful cancellation with zero audit trail |
| Phase impact | Phase 3 — cancellation moves to Kafka consumer; consumer deliberately omits audit event emission |

### VULN-04 — A01: IDOR on Booking Records *(new — Phase 1)*

| Field | Value |
|-------|-------|
| OWASP ID | A01 |
| CWE | CWE-639 |
| Severity | medium |
| Location | `src/controllers/BookingController.js` |
| Method | `listAll()`, `getById()` |
| Line range | (to be determined) |
| Annotation | `// VULNERABILITY A01: Booking list/detail returns records for any user without ownership verification.` |
| Description | `GET /api/bookings` returns all bookings in the system regardless of which user is authenticated. `GET /api/bookings/:id` returns a specific booking with no check that the requesting user owns it. Both endpoints expose license plates, contact emails, and parking history. |
| Exploit vector | Authenticate as any user, then `GET /api/bookings` to retrieve all bookings including PII |
| Phase impact | Phase 1 — implemented in new PostgreSQL-backed `BookingController` |
| Decoy nearby | `POST /api/bookings/:id/cancel` in same controller verifies `booking.userId === req.session.userId` before allowing cancellation |

### VULN-05 — A05: Debug Configuration Endpoint *(new — Phase 2)*

| Field | Value |
|-------|-------|
| OWASP ID | A05 |
| CWE | CWE-200 |
| Severity | medium |
| Location | `src/controllers/AdminController.js` |
| Method | `debugConfig()` |
| Line range | (to be determined) |
| Annotation | `// VULNERABILITY A05: Unauthenticated debug endpoint exposes internal service topology.` |
| Description | `GET /api/admin/debug` returns a JSON object containing `DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `KAFKA_BROKERS`, and `ELASTICSEARCH_URL` with no authentication requirement. An attacker learns the internal hostnames and ports of all backend services. |
| Exploit vector | `GET /api/admin/debug` → extracts `redis:6379`, `kafka:9092`, `elasticsearch:9200` |
| Phase impact | Phase 2 — implemented as a new route in `AdminController` |
| Decoy nearby | `GET /api/health` in `HealthController.js` (adjacent file) returns only `{ status: 'ok' }` with zero internal detail |

### VULN-06 — A10: SSRF via Spot Photo Import *(new — Phase 3)*

| Field | Value |
|-------|-------|
| OWASP ID | A10 |
| CWE | CWE-918 |
| Severity | medium |
| Location | `src/services/SpotPhotoService.js` |
| Method | `importPhoto()` |
| Line range | (to be determined) |
| Annotation | `// VULNERABILITY A10: Spot photo import fetches user-supplied URL without hostname validation.` |
| Description | `POST /api/spots/:id/photo` accepts `{ imageUrl }` and calls `axios.get(imageUrl)` directly. An attacker supplies `http://redis:6379/FLUSHALL`, `http://kafka:9092`, or `http://elasticsearch:9200` to interact with internal services. |
| Exploit vector | `POST /api/spots/A-101/photo` with `{ imageUrl: "http://redis:6379/INFO" }` — sends HTTP request to internal Redis |
| Phase impact | Phase 3 — implemented after Kafka/Redis/ES are wired |
| Decoy nearby | `src/services/GeocodingService.js` → `resolveAddress()` in same directory fetches external URLs but validates hostname against `['api.maps.example.com']` allowlist first |

### VULN-07 — A02: Hardcoded JWT Secret *(new — Phase 4)*

| Field | Value |
|-------|-------|
| OWASP ID | A02 |
| CWE | CWE-798 |
| Severity | low |
| Location | `src/config/appConfig.js` |
| Method | (module-level constant) |
| Line range | (to be determined) |
| Annotation | `// VULNERABILITY A02: Hardcoded JWT secret allows offline token forgery.` |
| Description | The JWT signing secret is defined as a module-level constant `JWT_SECRET = 'parking-mgmt-secret-key-2024'`. It is never rotated, never fetched from a vault, and visible in source code, build artifacts, and error stack traces. Any attacker with read access to the codebase (or a stack trace revealing the secret) can forge valid JWT tokens for any user. |
| Exploit vector | Extract secret from source/config → forge `{ sub: <admin_id>, role: 'ADMIN' }` token → access admin endpoints |
| Phase impact | Phase 4 — implemented when JWT auth replaces cookie sessions |
| Decoy nearby | `AuthController.refreshToken()` in same directory validates `iss`, `aud`, `exp` claims and uses a rotating secret fetched from DB |

---

## Chained Vulnerability Scenarios

### chain-01 — ES Injection → Client-Controlled Kafka Event → Missing Audit in Consumer → `data_modification`

**Remodeled in Phase 3 to cross async boundary.**

| Step | OWASP | Severity | Description | Location | Method |
|------|-------|----------|-------------|----------|--------|
| 1 | A03 | Medium | User search input embedded in Elasticsearch `query_string` exposes all spots and prices | `src/search/ParkingSearchClient.js` | `searchByQueryString()` |
| 2 | A04 | Medium | Booking producer publishes event to Kafka with client-supplied `totalCost` — no server-side recalculation | `src/producers/BookingProducer.js` | `publishBooking()` |
| 3 | A09 | Low | Booking consumer inserts reservation into PostgreSQL without emitting an audit event | `src/consumers/BookingConsumer.js` | `processBooking()` |

**Attack narrative**:

1. Attacker sends `GET /api/spots/search?q=*:*` to the search endpoint. The raw query reaches Elasticsearch's `query_string` parser, broadening results to include all spots including premium/restricted zones. Attacker learns spot IDs and pricing.
2. Attacker crafts a `POST /api/bookings/book` request with `{ spotId: <premium_spot>, durationHours: 720, totalCost: 0 }`. The controller publishes a `reservation-requested` event to Kafka with the client-supplied `totalCost` intact.
3. The `BookingConsumer` (separate process, `src/consumers/`) reads the event, inserts the zero-cost booking into PostgreSQL, and cancels subsequent adjustments without structured audit logging.

**Boundaries crossed**: HTTP controller → Kafka (async) → consumer process → PostgreSQL

**Combined Impact**: Unauthorized data modification — premium spot booked at zero cost with no audit trail.

### chain-02 — Debug Config Leak → SSRF Internal Pivot → `lateral_movement`

| Step | OWASP | Severity | Description | Location | Method |
|------|-------|----------|-------------|----------|--------|
| 1 | A05 | Low | Unauthenticated admin debug endpoint returns internal service URLs | `src/controllers/AdminController.js` | `debugConfig()` |
| 2 | A10 | Medium | Photo import endpoint fetches user-supplied URL — attacker supplies internal service address | `src/services/SpotPhotoService.js` | `importPhoto()` |

**Attack narrative**:

1. Attacker calls `GET /api/admin/debug` (no auth required). Response returns:
   ```json
   { "DATABASE_URL": "postgresql://parking:parkingpass@postgres:5432/parkingdb",
     "REDIS_URL": "redis://redis:6379/36",
     "KAFKA_BROKERS": "kafka:9092",
     "ELASTICSEARCH_URL": "http://elasticsearch:9200" }
   ```
2. Attacker sends `POST /api/spots/A-101/photo` with `{ imageUrl: "http://redis:6379/FLUSHALL" }`. The `importPhoto()` service calls `axios.get("http://redis:6379/FLUSHALL")` from within the Docker network, reaching the internal Redis container.

**Boundaries crossed**: Express web container → Redis container (cross-Docker-network)

**Combined Impact**: Lateral movement — attacker pivots from the web application into internal infrastructure, flushing Redis cache or probing Kafka/ES.

### chain-03 — Hardcoded JWT → Weak Token Validation → Cross-DB IDOR on Export → `db_exfiltration`

| Step | OWASP | Severity | Description | Location | Method |
|------|-------|----------|-------------|----------|--------|
| 1 | A02 | Low | JWT secret hardcoded in config enables offline token forgery | `src/config/appConfig.js` | (constant) |
| 2 | A07 | Medium | JWT verification validates signature only — ignores `sub`, `aud`, `iss` claims | `src/middleware/auth.js` | `verifyToken()` |
| 3 | A01 | Medium | Export endpoint accepts arbitrary `bookingIds[]`, joins PostgreSQL bookings with MongoDB user profiles, returns PII dump | `src/services/ExportService.js` | `exportBookingReport()` |

**Attack narrative**:

1. Attacker extracts the hardcoded JWT secret from `appConfig.js` (or from a stack trace that reveals it). Using this secret, attacker forges a JWT with `{ sub: 1, role: 'CUSTOMER' }` — a low-privilege user.
2. The auth middleware (`verifyToken()`) validates the signature matches the hardcoded secret and trusts the token without checking whether the `sub` claim matches a real user or whether `role` should grant access to admin endpoints.
3. Attacker sends `GET /api/admin/exports/bookings` with `{ bookingIds: [1,2,3,4,...] }`. The export service executes a Postgres query for bookings and joins results with MongoDB user profile documents (license plates, contact emails), returning a full PII dump.

**Boundaries crossed**: Config file → middleware layer → PostgreSQL + MongoDB (cross-data-store join)

**Combined Impact**: Database exfiltration — bulk extraction of user PII including license plates, contact emails, and complete parking history.

---

## Decoy Patterns

### Existing (carry forward)

| # | Location | Looks Vulnerable | Actually Safe |
|---|----------|-----------------|---------------|
| D1 | `src/services/SpotService.js` → `createSpot()` | Also mutates data — could be missing audit logs | Publishes security audit event and logs the spot registration |
| D2 | `src/controllers/SpotController.js` → `findById()` | Also looks up spots by user-supplied ID — could be ES injection | Uses repository `findById()` rather than constructing a query string |
| D3 | `src/referenceGuards.js` → `allowedRedirect()` | Looks like it validates URLs (like SSRF target) | Implements a proper hostname allowlist |

### New (planted during upgrade)

| # | Location | Looks Vulnerable | Actually Safe | Phase |
|---|----------|-----------------|---------------|-------|
| D4 | `src/controllers/BookingController.js` → `cancel()` | Same file as IDOR booking list; also operates on booking IDs | Verifies `req.session.userId === booking.userId` before allowing cancellation | 1 |
| D5 | `src/controllers/HealthController.js` → `health()` | Looks like it could leak internal config (same pattern as debug endpoint) | Returns only `{ status: 'ok' }` with zero internal detail | 2 |
| D6 | `src/services/GeocodingService.js` → `resolveAddress()` | Same directory as SSRF photo import; also fetches external URLs | Validates hostname against `['api.maps.example.com']` allowlist before fetching | 3 |
| D7 | `src/controllers/AuthController.js` → `refreshToken()` | Same file as JWT login; also handles token operations | Validates `iss`, `aud`, `exp` claims and uses rotating secret from database | 4 |
| D8 | `src/middleware/adminOnly.js` | Same directory as weak `verifyToken` middleware | Properly verifies `req.session.role === 'ADMIN'` with session signature check | 4 |

---

## No-Touch Files

The following files contain existing vulnerability annotations or decoy patterns and must not be altered in any way that removes or weakens the planted vulnerability:

| File | Contains | Constraint |
|------|----------|------------|
| `src/search/ParkingSearchClient.js` | VULN-01 (A03), chain-01 step 1 | Must keep `query_string` concatenation. May replace mock ES client with real one. |
| `src/services/BookingService.js` | VULN-02 (A04), VULN-03 (A09), chain-01 steps 2-3 | Must keep client-trusted `totalCost` and missing audit log. May be refactored into producer/consumer split in Phase 3 as long as the vulnerability logic is preserved. |
| `src/referenceGuards.js` | Decoy D3 | Must remain as-is; safe URL validation logic must not be broken or removed. |
| `src/services/SpotService.js` | Decoy D1 | Audit event emission must remain in `createSpot()`. |
| `src/controllers/SpotController.js` | Decoy D2 | `findById()` must remain parameterized/safe. |

---

## OWASP Coverage Gap Analysis

### Before Upgrade

| OWASP | Covered | How |
|-------|---------|-----|
| A01 | **No** | Gap — no IDOR or access control vuln |
| A02 | **No** | Gap — no crypto failure planted |
| A03 | Yes | VULN-01 (ES injection), chain-01 step 1 |
| A04 | Yes | VULN-02 (client pricing), chain-01 step 2 |
| A05 | **No** | Gap — no security misconfiguration exposed |
| A06 | **No** | Impractical as exploitable code in benchmark context |
| A07 | **No** | Gap — no authentication failure planted |
| A08 | **No** | Gap — no integrity failure planted |
| A09 | Yes | VULN-03 (missing audit), chain-01 step 3 |
| A10 | **No** | Gap — no SSRF planted |

**Coverage before**: 3 of 10 (A03, A04, A09)

### After Upgrade

| OWASP | Covered | How |
|-------|---------|-----|
| A01 | **Yes** | VULN-04 (booking IDOR), chain-03 step 3 (cross-DB IDOR) |
| A02 | **Yes** | VULN-07 (hardcoded JWT), chain-03 step 1 |
| A03 | Yes | VULN-01 (ES injection), chain-01 step 1 |
| A04 | Yes | VULN-02 (client pricing), chain-01 step 2 |
| A05 | **Yes** | VULN-05 (debug endpoint), chain-02 step 1 |
| A06 | No | Impractical as exploitable code |
| A07 | **Yes** | chain-03 step 2 (weak JWT validation) |
| A08 | No | Can be added as optional 8th vuln if desired |
| A09 | Yes | VULN-03 (missing audit), chain-01 step 3 |
| A10 | **Yes** | VULN-06 (SSRF), chain-02 step 2 |

**Coverage after**: 8 of 10 (A01, A02, A03, A04, A05, A07, A09, A10)
