# Complexity Upgrade Plan — app-36: Parking Management System

## Overview

Upgrade the Parking Management System from an in-memory Express monolith to a polyglot-persistence, event-driven architecture orchestrated via Docker Compose. Wire real PostgreSQL, MongoDB, Redis, Kafka/Redpanda, and Elasticsearch backends. Plant 4 new standalone vulnerabilities (A01, A02, A05, A10) and 2 new cross-boundary chained attack scenarios. Restructure into MVC + event-driven code layout.

## Architecture Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Relational DB | PostgreSQL 16 | Users, spots, bookings — SQL-based IDOR and parameterized decoys |
| Document DB | MongoDB 7 | Lot layout geometries, dynamic pricing rules — cross-DB IDOR |
| Cache | Redis 7 | Session tokens, vacancy counts — plaintext exposure, SSRF pivot |
| Message Queue | Redpanda/Kafka (`kafkajs`) | Async booking events — boundary for chain-01, SSRF target for chain-02 |
| Search Engine | Elasticsearch 8 | Spot search — query DSL injection |
| Batch Scheduler | `node-cron` | Scheduled export job — cross-DB IDOR chain step |

## Phase Index

| Phase | Title | Focus | New Vulns | Status |
|-------|-------|-------|-----------|--------|
| [1](phase-01/plan.md) | PostgreSQL Wiring + Core Migrations | `pg` client, migrations, repositories, booking IDOR, `.env.example` | A01 | Not started |
| [2](phase-02/plan.md) | Redis + MongoDB Wiring | Session cache, lot layouts, debug endpoint, cross-DB decoy | A05 | Not started |
| [3](phase-03/plan.md) | Kafka + Elasticsearch Wiring | `kafkajs`, real ES, SSRF photo import, remodel chain-01 across async boundary | A10 | Not started |
| [4](phase-04/plan.md) | JWT Auth + Admin UI + Export | Hardcoded JWT, weak validation, export service, admin dashboard, chain-03 | A02 | Not started |
| [5](phase-05/plan.md) | Verification + Evaluation | Integration tests, Docker smoke tests, `eval-report.md` | — | Not started |

## Key Documents

| Document | Description |
|----------|-------------|
| [expansion-plan.md](./expansion-plan.md) | Master plan — architecture, vuln strategy, API inventory, phases |
| [vuln-inventory.md](./vuln-inventory.md) | No-touch zone reference — every vuln, chain, and decoy |
| [eval-report.md](./eval-report.md) | Difficulty ratings + hint leakage validation (generated in Phase 5) |

## OWASP Coverage

| Category | Before | After |
|----------|--------|-------|
| A01 (Broken Access Control) | ✗ | ✓ (IDOR + cross-DB IDOR) |
| A02 (Cryptographic Failures) | ✗ | ✓ (Hardcoded JWT secret) |
| A03 (Injection) | ✓ (ES injection) | ✓ (ES injection) |
| A04 (Insecure Design) | ✓ (Client pricing) | ✓ (Client pricing) |
| A05 (Security Misconfiguration) | ✗ | ✓ (Debug endpoint) |
| A06 (Vulnerable Components) | ✗ | ✗ (Impractical as exploitable code) |
| A07 (Auth Failures) | ✗ | ✓ (Weak JWT validation — chain) |
| A08 (Integrity Failures) | ✗ | ✗ (Optional — can add if desired) |
| A09 (Logging Failures) | ✓ (Missing audit) | ✓ (Missing audit) |
| A10 (SSRF) | ✗ | ✓ (Photo import SSRF) |

### Chain Coverage

| Chain ID | Steps | Impact | Crosses |
|----------|-------|--------|---------|
| chain-01 | A03 → A04 → A09 | `data_modification` | HTTP → Kafka → PostgreSQL (3 files, async boundary) |
| chain-02 | A05 → A10 | `lateral_movement` | Express → Redis container (cross-Docker-network) |
| chain-03 | A02 → A07 → A01 | `db_exfiltration` | Config → Middleware → PostgreSQL + MongoDB (3 layers, 2 DBs) |
