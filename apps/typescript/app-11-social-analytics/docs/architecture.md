# Architecture Document — App 11: Social Media Analytics Dashboard

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A TypeScript Express analytics dashboard for campaign widgets, link previews, and internal marketing service lookups. Supports PostgreSQL, Redis, Elasticsearch, and Redpanda in Docker Compose for full-stack operation.

## Architecture Diagram

```
Browser / HTTP Client
        │
        ▼
┌────────────────────┐
│   Express App      │  (port 8011)
│   (TypeScript)     │
└───┬───┬──────┬─────┘
    │   │      │
    ▼   ▼      ▼
┌────┐ ┌────┐ ┌──────┐
│ PG │ │ES  │ │Kafka │
│16  │ │8   │ │(RPN) │
└────┘ └────┘ └──────┘
```

## Directory Structure

```
src/
├── config/        — DB, Redis, Kafka, ES connections
├── controllers/   — HTTP request handlers (AuthController, WidgetController, PreviewController, DebugController)
├── services/      — Business logic (AuthService, PreviewService, InternalSearchService, etc.)
├── repositories/  — Data access (UserRepository, SessionRepository, WidgetRepository)
├── models/        — Data types and interfaces
├── routes/        — Express route definitions
├── cache/         — Redis session cache
├── mq/            — Kafka producer/consumer stubs
├── search/        — Elasticsearch client
├── db/            — PostgreSQL connection pool
├── app.ts         — Express app factory
└── index.ts       — Entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | Decoupled client-side SPA (HTML5, JS, CSS) |
| Database / Cache | PostgreSQL 16, Redis 7 |
| Search | Elasticsearch 8 |
| Events | Redpanda (Kafka API) |
| Containerization | Docker, Docker Compose |

## Data Entities

User, Session, Widget, PreviewCache — stored in PostgreSQL with Redis for session caching.

## Deployment

5 Docker services (Docker Compose): web (Express :8011), postgres (:5432), redis (:6379), redpanda (:9092), elasticsearch (:9200)

## Security Architecture

- 3 standalone vulnerabilities (A05 debug config leak, A10 SSRF on preview fetch, A01 broken access control on internal search)
- 1 chained attack: chain-01 (lateral_movement: debug config leak → SSRF preview → internal search pivot)
- See `.vulns` for the complete manifest.
