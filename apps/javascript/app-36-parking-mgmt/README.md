# Parking Management System

## Overview
A JavaScript Express parking reservation service for searching spaces, registering spots, booking reservations, and canceling tickets.

## Business Domain
Logistics and parking services.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, JavaScript |
| Database | PostgreSQL 16 (relational), MongoDB 7 (lot layouts, pricing rules) |
| Cache | Redis 7 (session cache, vacancy counts) |
| Search | Elasticsearch 8 (via `@elastic/elasticsearch`) |
| Event Streaming | Apache Kafka / Redpanda (via `kafkajs`) |
| Auth | JWT (via `jsonwebtoken`), hardcoded secret |
| UI | EJS templates (admin dashboard) |
| Containerisation | Docker, Docker Compose |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features
- Customer registration and login (Redis-backed sessions + JWT)
- Admin parking spot registration with audit event publishing
- Elasticsearch-powered parking spot search (with query-string injection)
- Public spot detail lookup by ID
- Booking creation and cancellation (async via Kafka)
- PostgreSQL-backed data persistence
- MongoDB-backed lot layouts and dynamic pricing rules
- Debug configuration endpoint
- Spot photo import (with SSRF)
- Cross-DB booking export (PostgreSQL + MongoDB)
- Admin dashboard with vacancy grid and pricing rules

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to `.vulns` for the complete machine-readable vulnerability manifest.

---

## Chained Vulnerability Scenario

### Chain: "ES Injection → Client-Controlled Pricing in Kafka → Missing Audit in Consumer → Data Modification"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | User input is embedded directly in Elasticsearch `query_string` syntax | Medium | A03 | `src/search/ParkingSearchClient.js` → `searchByQueryString()` |
| 2 | Booking producer passes client-supplied `totalCost` into Kafka event without recalculation | Medium | A04 | `src/producers/BookingProducer.js` → `publishBooking()` |
| 3 | Booking consumer persists the booking without emitting a security audit event | Low | A09 | `src/consumers/BookingConsumer.js` → `processBooking()` |

**Attack narrative**: The attacker submits a broad ES payload such as `* OR type:Premium` to enumerate premium spots, posts a booking with `total_cost` set to `0`, and the Kafka consumer applies the zero-cost booking without producing a security audit record.

**Boundaries crossed**: HTTP controller → Kafka producer → Kafka consumer → PostgreSQL.

**Combined Impact**: Unauthorized data modification.

### Chain: "Debug Config Leak → SSRF Internal Pivot → Lateral Movement"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Unauthenticated debug endpoint returns internal service URLs | Low | A05 | `src/controllers/AdminController.js` → `debugConfig()` |
| 2 | Spot photo import fetches user-supplied URL without hostname validation | Medium | A10 | `src/services/SpotPhotoService.js` → `importPhoto()` |

**Attack narrative**: The attacker calls `GET /api/admin/debug` to learn `redis:6379`, `kafka:9092`, `elasticsearch:9200`. Then sends `POST /api/spots/A-101/photo` with `{ imageUrl: "http://redis:6379/FLUSHALL" }` — the SSRF reaches Redis from within the Docker network.

**Boundaries crossed**: Express web container → Redis container (cross-Docker-network).

**Combined Impact**: Lateral movement from the web container into internal infrastructure.

### Chain: "Hardcoded JWT → Weak Token Validation → Cross-DB IDOR on Export → DB Exfiltration"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | JWT secret hardcoded in config as module constant | Low | A02 | `src/config/appConfig.js` → `(constant)` |
| 2 | JWT middleware validates signature only — ignores sub/role claims | Medium | A07 | `src/middleware/jwtAuth.js` → `verifyToken()` |
| 3 | Export endpoint joins PostgreSQL and MongoDB without ownership check | Medium | A01 | `src/services/ExportService.js` → `exportBookingReport()` |

**Attack narrative**: The attacker reads the hardcoded JWT secret from source code (`parking-mgmt-secret-key-2024`), forges a token with `role: ADMIN`, sends a POST to `/api/admin/exports/bookings` with `{ bookingIds: [1,2,3] }`. The export service joins PostgreSQL bookings with MongoDB user profiles, returning a full PII dump including license plates, contact emails, phone numbers, addresses, and payment card last-4 digits.

**Boundaries crossed**: Config layer → middleware layer → PostgreSQL + MongoDB (cross-data-store join).

**Combined Impact**: Database exfiltration — bulk extraction of user PII.

---

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register new customer account |
| POST | `/api/auth/login` | None | Authenticate customer (session-based) |
| POST | `/api/auth/logout` | Session | Clear session |
| POST | `/api/auth/jwt-login` | None | Authenticate customer (JWT-based) |
| POST | `/api/auth/refresh` | JWT | Refresh JWT token (validates iss/aud/exp) |
| GET | `/api/health` | None | Container health check (no internal detail) |
| GET | `/api/spots/search` | None | Search parking spots (ES injection target) |
| GET | `/api/spots/:id` | None | Get specific spot details |
| GET | `/api/spots/:id/layout` | None | Get parking lot layout from MongoDB |
| POST | `/api/spots/:id/photo` | Session (Admin) | Import spot photo from URL (SSRF target) |
| GET | `/api/admin/debug` | None | Debug config — returns internal service URLs (A05 vuln) |
| GET | `/api/admin/dashboard` | Session/JWT (Admin) | Admin dashboard (EJS) with vacancy grid |
| POST | `/api/admin/spots` | Session (Admin) | Register new parking spots |
| POST | `/api/admin/exports/bookings` | JWT (Admin) | Export booking report (chain-03 step 3) |
| GET | `/api/bookings` | Session | List all bookings (IDOR) |
| GET | `/api/bookings/:id` | Session | Get booking detail (IDOR) |
| POST | `/api/bookings/book` | Session | Book a parking spot (202, async via Kafka) |
| POST | `/api/bookings/:id/cancel` | Session | Cancel parking reservation (202, async via Kafka) |

## Running Locally
```bash
cd apps/javascript/app-36-parking-mgmt
npm install
npm start
# API served at http://localhost:8036
```

## Running via Docker
```bash
docker compose up --build
# API served at http://localhost:8036
```
