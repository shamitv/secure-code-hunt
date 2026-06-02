# Complexity Upgrade Plan — app-17: IoT Device Dashboard

## Overview

Upgrade the IoT Device Dashboard from in-memory stubs (Map-based sessions, in-process events,
no-op search client) to a fully wired Docker-orchestrated system with real PostgreSQL, Redis,
Redpanda (Kafka), Elasticsearch, WebSockets, and an HTML telemetry dashboard.

## Architecture Components

| Component | Technology | Purpose |
|---|---|---|
| Relational DB | PostgreSQL 16 | Device config, user accounts, telemetry records |
| Cache | Redis 7 | Session store (replace in-memory Map) |
| Message Queue | Redpanda v24.1 (Kafka API) | Streaming device telemetry and commands |
| Search Engine | Elasticsearch 8 | Device audit logs, diagnostics search |
| Real-time | WebSocket (`ws`) | Live telemetry broadcast + HTML dashboard |

## Phase Index

| Phase | Title | Focus | New Vulns | Status |
|---|---|---|---|---|
| [1](phase-01/plan.md) | Infrastructure Wiring + Data Migration | Wire PostgreSQL + Redis; migration schema; replace in-memory stubs | A03, A01 | Not started |
| [2](phase-02/plan.md) | Event Streaming + Search Integration | Wire Redpanda + Elasticsearch; real consumers/search; chain-02 | A08, A09 | Not started |
| [3](phase-03/plan.md) | Real-time Dashboard + WebSocket | WebSocket server; HTML telemetry dashboard; ES DSL injection | A07, A03 | Not started |
| [4](phase-04/plan.md) | Verification + Metadata + Eval | Exploitability tests; metadata sync; hint leakage scan; eval report | — | Not started |

## Key Documents

| Document | Description |
|---|---|
| [expansion-plan.md](./expansion-plan.md) | Master plan: architecture, vuln strategy, API inventory |
| [vuln-inventory.md](./vuln-inventory.md) | No-touch zone reference: every existing vuln, chain, decoy |
| [eval-report.md](./eval-report.md) | Difficulty ratings + hint leakage validation (post-completion) |

## OWASP Coverage

| Category | Before | After |
|---|---|---|
| A01 — Broken Access Control | — | IDOR on device telemetry |
| A02 — Cryptographic Failures | Plaintext tokens ×2 | + chain link for chain-02 |
| A03 — Injection | — | SQLi in telemetry filter + ES DSL injection |
| A05 — Security Misconfiguration | Debug config leak | Unchanged |
| A07 — Auth Failures | — | Unauthenticated WebSocket |
| A08 — Integrity Failures | — | Unsafe deserialization in Kafka consumer |
| A09 — Logging Failures | — | Missing audit trail on event processing |
| A10 — SSRF | Device refresh SSRF | Unchanged |
