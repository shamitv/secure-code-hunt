# Telemedicine Appointment System

## Overview
A TypeScript Express telemedicine portal for patient registration, appointment listing, physician notes review, clinical notes, and prescription processing.

## Business Domain
Healthcare and telemedicine appointment management.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Primary Database | PostgreSQL 16 (users, appointments, prescription logs) |
| Document Store | MongoDB 6 (clinical notes) |
| Cache / Sessions | Redis 7 (appointment cache, session blacklisting) |
| Event Streaming | Apache Kafka / Redpanda (audit events, prescription processing, notifications) |
| Search Engine | Elasticsearch 8 (patient notes search) |
| Authentication | JSON Web Tokens |
| Containerisation | Docker, Docker Compose |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features
- Patient registration and login with BCrypt password hashing
- Scoped appointment list for patients and doctors
- Appointment detail view with physician notes
- Appointment booking with schedule validation
- Clinical note creation and retrieval via MongoDB
- Patient notes search via Elasticsearch
- Audit event streaming via Kafka
- Prescription processing via Kafka consumer
- Session token blacklisting via Redis
- BCrypt password storage

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to `.vulns` for the complete machine-readable vulnerability manifest.

---

## Chained Vulnerability Scenarios

### Chain 1: "Weak JWT Validation → Patient Notes IDOR → DB Exfiltration"

An attacker forges or tampers with a JWT because the server decodes tokens without signature validation, then enumerates appointment records that expose private physician notes by ID.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | JWT payload is decoded without validating the signature | Medium | A07 | `src/services/TokenService.ts` → `verify()` |
| 2 | Appointment detail loads patient notes by ID without patient or doctor ownership checks | Medium | A01 | `src/services/AppointmentService.ts` → `getAppointmentDetail()` |

**Attack narrative**: The attacker creates a JWT containing a chosen `userId`, `username`, and `role`, places it in the `token` cookie, then requests `/api/appointments/1`, `/api/appointments/2`, and subsequent IDs. Because token signatures are not verified and appointment details are not scoped to the caller, the responses include confidential physician notes.

**Combined Impact**: The attacker can bulk-read confidential appointment records and doctor notes, resulting in high-impact database exfiltration.

---

### Chain 2: "Schedule Override → Missing Audit → Undetected Prescription Tampering"

An attacker passes `allowOverride=true` to book an overlapping appointment, then the prescription Kafka consumer processes the resulting event and writes prescription data to PostgreSQL without any audit log entry, making the unauthorized prescription untraceable.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Schedule validator skips overlap check when allowOverride=true | Low | A04 | `src/services/ScheduleValidator.ts` → `validateSlot()` |
| 2 | Prescription consumer writes to DB without audit trail entries | Low | A09 | `src/consumers/PrescriptionConsumer.ts` → `processPrescription()` |

**Combined Impact**: Undetected creation of unauthorized prescription records, resulting in data modification.

---

### Chain 3: "Debug Topology Leak → SSRF Internal Pivot"

An attacker hits `GET /api/internal/status` to retrieve Elasticsearch, Redis, Kafka, and MongoDB internal hostnames, then pivots to those services via the SSRF-vulnerable `search_url` parameter in patient search.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Debug endpoint exposes internal service URLs without authentication | Low | A05 | `src/controllers/DebugController.ts` → `status()` |
| 2 | Patient search accepts search_url parameter to override ES target host | Low | A10 | `src/search/PatientSearchClient.ts` → `searchPatients()` |

**Combined Impact**: The attacker can pivot from the compromised debug endpoint to internal services, resulting in lateral movement.

---

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register a patient |
| POST | `/api/auth/login` | None | Authenticate user and set token cookie |
| POST | `/api/auth/logout` | Session | Clear authentication cookie and blacklist session |
| GET | `/api/auth/me` | Session | Retrieve current authenticated user details |
| GET | `/api/health` | None | Container health check |
| GET | `/api/appointments` | Session | List scoped appointments |
| GET | `/api/appointments/:id` | Session | Retrieve detailed appointment info |
| POST | `/api/appointments` | Session | Book a new appointment |
| GET | `/api/clinical-notes/:id` | Session | Retrieve clinical note by ID |
| POST | `/api/clinical-notes` | Session | Create a clinical note |
| GET | `/api/patients/search` | Session | Search patient notes via Elasticsearch |
| GET | `/api/internal/status` | None | Debug endpoint exposing internal service topology |

## Running Locally
```bash
cd apps/typescript/app-14-telemedicine
npm install
npm run build
npm start
# API served at http://localhost:8014
```

## Running via Docker
```bash
docker compose up --build
# API served at http://localhost:8014
```
