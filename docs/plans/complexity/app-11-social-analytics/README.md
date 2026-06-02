# Complexity Upgrade Plan — app-11: Social Media Analytics Dashboard

## Overview

Upgrade the analytics dashboard from an in-memory Express application to a Docker-orchestrated enterprise system with real PostgreSQL/TimescaleDB, Elasticsearch, Apache Kafka (Redpanda), Redis, WebSocket live dashboards, and a real-time Chart.js UI. Expands OWASP coverage from 5/10 to 8/10.

## Architecture Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary DB | PostgreSQL 16 | User accounts, widgets, dashboard configs, analytics events |
| Cache | Redis 7 | Session management, rate-limiting |
| Search Engine | Elasticsearch 8 | Full-text search on social feed comments |
| Event Broker | Redpanda (Kafka protocol) | Real-time metrics ingestion pipeline |
| Real-time | WebSocket (`ws`) | Live dashboard metric pushes |

## Phase Index

| Phase | Title | Focus | New Vulns | Status |
|-------|-------|-------|-----------|--------|
| [1](phase-01/plan.md) | Infrastructure Wiring | Replace InMemoryDatabase + stub cache with real PostgreSQL + Redis | — | Planned |
| [2](phase-02/plan.md) | PostgreSQL Migration + Dashboard Search | SQL schema, seed data, DashboardRepository, A03 SQLi + A05 env leak | A03, A05 | Planned |
| [3](phase-03/plan.md) | Elasticsearch + Share Tokens | ES index mapping, SyncManager, search endpoint, A02 weak crypto | A02 | Planned |
| [4](phase-04/plan.md) | Kafka Streaming + Widget Config | Real Kafka producer/consumer, A08 deserialization, A04 insecure design | A08, A04 | Planned |
| [5](phase-05/plan.md) | WebSockets + Enterprise UI | Live dashboard with Chart.js, WS server, A07 weak auth | A07 | Planned |
| [6](phase-06/plan.md) | Verification + Metadata | Exploitability checks, .vulns sync, hint leakage, eval report | — | Planned |

## Key Documents

| Document | Description |
|----------|-------------|
| [expansion-plan.md](./expansion-plan.md) | Master plan with architecture changes, vulnerability strategy, data model, API inventory |
| [vuln-inventory.md](./vuln-inventory.md) | No-touch zone reference of existing vulnerabilities, chains, and decoys |
| [eval-report.md](./eval-report.md) | Difficulty ratings + hint leakage validation (completed after Phase 6) |

## OWASP Target

After completion: **A01, A02, A03, A04, A05, A07, A08, A10** — 8/10 categories covered.
