# Architecture Document — App 17: IoT Device Dashboard

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A JavaScript Express IoT dashboard for user login, device command execution, device status refresh, and internal telemetry diagnostics. Supports PostgreSQL, Redis, Elasticsearch, WebSocket, and in-memory store.

## Architecture Diagram

```
Browser / HTTP Client / WebSocket Client
        │
        ▼
┌────────────────────────┐
│    Express App (JS)    │  (port 8017)
│    Controller →        │
│    Service →           │
│    Repository → DB     │
└───┬───┬───┬───┬───┬───┘
    │   │   │   │   │
    ▼   ▼   ▼   ▼   ▼
  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌─────┐
  │PG│ │Rds│ │ES│ │MQ│ │ WS  │
  │16│ │ 7 │ │ 8│ │  │ │Live │
  └──┘ └──┘ └──┘ └──┘ └─────┘
```

## Directory Structure

```
src/
├── config/        — DB, Redis, ES, WebSocket configuration
├── controllers/   — HTTP handlers (DeviceController, AuthController, DiagnosticsController)
├── services/      — Business logic (DeviceService, RefreshService, TelemetryService, etc.)
├── repositories/  — Data access (DeviceRepository, TelemetryRepository — A03 SQLi via filter)
├── consumers/     — Kafka-style consumers
├── models/        — Data models and schemas
├── routes/        — Express route definitions
├── cache/         — Redis cache client
├── mq/            — In-memory message queue
├── search/        — Elasticsearch diagnostics search (A03 DSL injection)
├── ws/            — WebSocket telemetry stream (A07 unauthenticated)
├── db/            — PostgreSQL connection pool + InMemoryStore
├── public/        — HTML dashboard assets
├── app.js         — Express app factory
└── index.js       — Entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, JavaScript |
| Database | PostgreSQL 16, InMemoryStore fallback |
| Cache | Redis 7 |
| HTTP Client | Axios |
| WebSocket | ws library |
| Search | Elasticsearch |
| Containerization | Docker, Docker Compose |

## Data Flow

```
POST /api/devices/command → Controller → Service → PostgreSQL
POST /api/devices/refresh → Service → Axios HTTP (user-supplied URL — A10 SSRF) → response returned
WS /ws/telemetry → WebSocket server (unauthenticated — A07) → real-time telemetry push
GET /api/devices/:id/telemetry → Repository → PostgreSQL (A01 IDOR — no device ownership check)
POST /api/devices/:id/telemetry/query → Repository → raw SQL concat (A03 SQLi)
```

## Deployment

5 Docker services (Docker Compose): web (Express :8017), postgres (:5432), redis (:6379), elasticsearch (:9200), redpanda (:9092)

## Security Architecture

- 7 standalone vulnerabilities (A01 IDOR on telemetry, A02 plaintext device tokens, A03 SQLi on telemetry filter + ES DSL injection, A05 verbose command errors leaking secrets, A07 unauthenticated WebSocket, A10 SSRF on device refresh)
- 2 chained attacks: chain-01 (lateral_movement: debug config leak → SSRF → plaintext device token exposure), chain-02 (db_exfiltration: IDOR telemetry → SQL injection → database exfiltration)
- 1 decoy: safe ES search with parameterized match query (GET /api/diagnostics/search/safe)
- See `.vulns` for the complete manifest.
