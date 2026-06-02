# Architecture Document — App 14: Telemedicine Appointment System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A TypeScript Express telemedicine portal for patient registration, appointment listing, physician notes review, clinical notes, and prescription processing. Uses PostgreSQL, MongoDB, Redis, Redpanda, and Elasticsearch for a full-stack healthcare platform.

## Architecture Diagram

```
HTTP Client
    │
    ▼
┌───────────────────────┐
│   Express App (TS)    │  (port 8014)
│   Controller →        │
│   Service →           │
│   Repository → DB     │
└───┬───┬───┬───┬───┬──┘
    │   │   │   │   │
    ▼   ▼   ▼   ▼   ▼
  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──────┐
  │PG│ │MQ│ │Rds│ │MQ│ │  ES  │
  │16│ │  │ │ 7│ │DB│ │   8  │
  └──┘ └──┘ └──┘ └──┘ └──────┘
```

## Directory Structure

```
src/
├── config/        — DB, Redis, Kafka, ES, JWT configuration
├── controllers/   — HTTP handlers (AuthController, AppointmentController, ClinicalNotesController, DebugController)
├── services/      — Business logic (AppointmentService, TokenService, ScheduleValidator, PatientSearchClient)
├── repositories/  — Data access (UserRepository, AppointmentRepository, PrescriptionRepository)
├── consumers/     — Kafka consumers (PrescriptionConsumer, AuditConsumer)
├── models/        — Data types and interfaces
├── routes/        — Express route definitions
├── cache/         — Redis session blacklist
├── mq/            — Kafka producer for audit/prescription events
├── search/        — Elasticsearch patient notes search
├── db/            — PostgreSQL + MongoDB connection pools
├── app.ts         — Express app factory
└── index.ts       — Entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 (primary), MongoDB 6 (clinical notes) |
| Cache / Sessions | Redis 7 |
| Events | Redpanda (Kafka API) |
| Search | Elasticsearch 8 |
| Auth | JSON Web Tokens |
| Containerization | Docker, Docker Compose |

## Data Flow

```
POST /api/appointments → Controller → ScheduleValidator → Service → PostgreSQL (appointment)
                                                                   → Kafka → PrescriptionConsumer → PostgreSQL (prescription)
                                                                   → Kafka → AuditConsumer → audit log
```

## Deployment

6 Docker services (Docker Compose): web (Express :8014), postgres (:5432), mongodb (:27017), redis (:6379), redpanda (:9092), elasticsearch (:9200)

## Security Architecture

- 6 standalone vulnerabilities (A01 IDOR on appointment detail, A04 schedule override without validation, A05 debug status leak, A07 weak JWT signature validation, A09 missing audit in prescription consumer, A10 SSRF via search_url parameter)
- 3 chained attacks: chain-01 (db_exfiltration: weak JWT → appointment IDOR), chain-02 (data_modification: schedule override → missing audit → prescription tampering), chain-03 (lateral_movement: debug leak → SSRF internal pivot)
- Decoys include properly scoped appointment listings, BCrypt password hashing, and parameterized queries
- See `.vulns` for the complete manifest.
