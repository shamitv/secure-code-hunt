# Architecture Document — App 36: Parking Management System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A JavaScript Express parking reservation service for searching spaces, registering spots, booking reservations, and canceling tickets. Uses PostgreSQL, MongoDB, Redis, Redpanda (Kafka), and Elasticsearch for a full-stack multi-DB platform.

## Architecture Diagram

```
HTTP Client / Browser (EJS admin views)
        │
        ▼
┌───────────────────────┐
│   Express App (JS)    │  (port 8036)
│   Controller →        │
│   Service →           │
│   Repository → DB     │
└───┬──┬───┬───┬───┬───┘
    │  │   │   │   │
    ▼  ▼   ▼   ▼   ▼
  ┌──┐┌──┐┌──┐┌──┐┌──────┐
  │PG│ │MQ│ │Rds│ │MQ│ │  ES │
  │16│ │  │ │ 7│ │DB│ │   8 │
  └──┘└──┘└──┘└──┘└──────┘
```

## Directory Structure

```
src/
├── config/        — DB, Redis, Kafka, ES, JWT configuration
├── controllers/   — HTTP handlers (AuthController, BookingController, SpotController, AdminController)
├── services/      — Business logic (SpotPhotoService — SSRF, ExportService — IDOR, GeocodingService — decoy)
├── repositories/  — Data access (PostgreSQL, MongoDB repositories)
├── middleware/     — JWT auth, admin session guard
├── models/        — Data models and schemas
├── routes/        — Express route definitions
├── cache/         — Redis session cache
├── mq/            — Kafka producer/consumer setup
├── producers/     — Kafka event producers (BookingProducer — A04)
├── consumers/     — Kafka event consumers (BookingConsumer — A09)
├── search/        — Elasticsearch client (ParkingSearchClient — A03)
├── db/            — PostgreSQL + MongoDB connection pools
├── app.js         — Express app factory
└── index.js       — Entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, JavaScript |
| Database | PostgreSQL 16 (primary), MongoDB 7 (lot layouts, pricing) |
| Cache | Redis 7 |
| Event Streaming | Redpanda (Kafka API) via kafkajs |
| Search | Elasticsearch 8 via @elastic/elasticsearch |
| Auth | JWT (jsonwebtoken) + session cookies |
| UI | EJS templates (admin dashboard) |
| Containerization | Docker, Docker Compose |

## Data Flow

```
POST /api/bookings/book → Controller → BookingProducer → Kafka
                                                        → BookingConsumer → PostgreSQL + MongoDB
POST /api/spots/:id/photo → SpotPhotoService → Axios (user URL — A10 SSRF)
GET /api/spots/search → ParkingSearchClient → ES (query_string injection — A03)
POST /api/admin/exports/bookings → ExportService → PostgreSQL JOIN MongoDB (A01 IDOR)
```

## Deployment

6 Docker services (Docker Compose): web (Express :8036), postgres (:5432), redis (:6379), redpanda (:9092), elasticsearch (:9200), mongodb (:27017)

## Security Architecture

- 7 standalone vulnerabilities (A01 IDOR on bookings, A02 hardcoded JWT secret, A03 ES query_string injection, A04 client-supplied pricing via Kafka, A05 unauthenticated debug endpoint, A07 weak JWT validation, A09 missing audit in consumer, A10 SSRF on photo import)
- 3 chained attacks: chain-01 (data_modification: ES injection → client-controlled pricing → missing audit), chain-02 (lateral_movement: debug config leak → SSRF internal pivot), chain-03 (db_exfiltration: hardcoded JWT → weak token validation → cross-DB IDOR export)
- 8 decoys (audit event on spot creation, parameterized spot lookup, URL validation allowlist, ownership-checked cancellation, role-based admin guard)
- See `.vulns` for the complete manifest.
