# Chained Vulnerability Scenarios — Parking Management

Supplemental notes only. Ground truth vulnerability data is maintained in [.vulns](.vulns), and the required human-readable chain is in [README.md](README.md).

## Standalone Vulnerabilities

### VULN-04 (A01 — IDOR on Booking Records)
The booking list endpoint (`GET /api/bookings`) returns all bookings regardless of session ownership. The booking detail endpoint (`GET /api/bookings/:id`) returns any booking by ID without checking if the requester owns it.

### VULN-05 (A05 — Debug Configuration Endpoint)
`GET /api/admin/debug` returns internal service URLs with no authentication. Leaks Docker network topology.

### VULN-06 (A10 — SSRF via Spot Photo Import)
`POST /api/spots/:id/photo` fetches user-supplied `imageUrl` without hostname validation. Can reach internal Redis/Kafka/ES.

### VULN-07 (A02 — Hardcoded JWT Secret)
`src/config/appConfig.js` contains `JWT_SECRET = 'parking-mgmt-secret-key-2024'` as a module constant, visible in source code.

## Chain: "ES Injection → Client-Controlled Pricing in Kafka → Missing Audit in Consumer"

| Step | Issue | Severity | OWASP | Location |
|------|-------|----------|-------|----------|
| 1 | Raw user input in ES `query_string` | Medium | A03 | `ParkingSearchClient.js` → `searchByQueryString()` |
| 2 | Client-supplied totalCost in Kafka event | Medium | A04 | `BookingProducer.js` → `publishBooking()` |
| 3 | No audit event on consumer | Low | A09 | `BookingConsumer.js` → `processBooking()` |

**Combined Impact**: Data modification across HTTP → Kafka → PostgreSQL.

## Chain: "Debug Config Leak → SSRF Internal Pivot → Lateral Movement"

| Step | Issue | Severity | OWASP | Location |
|------|-------|----------|-------|----------|
| 1 | Debug endpoint leaks internal topology | Low | A05 | `AdminController.js` → `debugConfig()` |
| 2 | Photo import fetches any URL | Medium | A10 | `SpotPhotoService.js` → `importPhoto()` |

**Combined Impact**: Lateral movement to Redis/Kafka/ES containers.

## Chain: "Hardcoded JWT → Weak Token Validation → Cross-DB IDOR on Export → DB Exfiltration"

| Step | Issue | Severity | OWASP | Location |
|------|-------|----------|-------|----------|
| 1 | Hardcoded JWT secret | Low | A02 | `appConfig.js` (constant) |
| 2 | JWT middleware skips claim validation | Medium | A07 | `jwtAuth.js` → `verifyToken()` |
| 3 | Export endpoint no ownership check | Medium | A01 | `ExportService.js` → `exportBookingReport()` |

**Attack narrative**: Attacker extracts `parking-mgmt-secret-key-2024` from source, forges an admin JWT, POSTs to `/api/admin/exports/bookings` with `{ bookingIds: [1,2,3] }`, and receives a cross-DB PII dump (license plates, contacts, payment last-4).

**Combined Impact**: Database exfiltration of user PII across PostgreSQL and MongoDB.
