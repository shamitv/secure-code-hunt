# App 11 (social-analytics) — Complexity Upgrade Expansion Plan

## Overview

Upgrade the Social Media Analytics Dashboard from an in-memory Express + TypeScript application (InMemoryDatabase, in-process Kafka stubs, mock session cache) to a Docker-orchestrated, enterprise-grade system with real PostgreSQL/TimescaleDB, Elasticsearch, Apache Kafka, Redis, WebSocket live dashboards, and a real-time Chart.js UI. Expands OWASP coverage from 5/10 to 8/10.

**Current app**: TypeScript/Express, 30 source files, 14 endpoints, 5 standalone vulns, 1 chained scenario
**Target app**: Same 14 endpoints upgraded to real DB/Kafka/ES + WebSocket server + new search/share/dashboard features, ~50 source files

> **Non-goals / Constraints**
> - Do **not** remove or fix any intentionally planted vulnerability listed in [vuln-inventory.md](./vuln-inventory.md).
> - Add new code with realistic patterns, including **decoy safe code** near vulnerable-looking code.
> - Add 1--2 new standalone vulnerabilities per phase, plus new chained scenarios.
> - Update `.vulns`, `README.md`, `scenarios.md` after each phase.
> - Avoid introducing real external network dependencies beyond Docker Compose.

---

## Current State

| Property | Value |
|----------|-------|
| App ID | `app-11` |
| Language | TypeScript |
| Framework | Express |
| Current structure | Modular `src/` with controllers, services, repositories, routes, config, consumers, cache, db, mq, search |
| Standalone vulns | 5 (A10 SSRF, A05 Debug, A01 Access Control, A03 XSS, A05 Hardcoded Key) |
| Chain scenarios | 1 (chain-01: Debug Config Leak -> HTTP SSRF -> Internal Search Pivot -> lateral_movement) |
| Decoys | 2 (`referenceGuards.ts` allowedCallback, `SessionCache.ts` crypto.randomBytes) |
| OWASP gaps | A02, A04, A06, A07, A08, A09 uncovered |
| Test suite | `tests/contract.test.js` validates endpoint contract + annotation presence |

---

## Architecture Changes

### 1) Infrastructure — Replace Stubs with Real Services

| Component | Current (stub) | Target (real) |
|-----------|---------------|---------------|
| Primary DB | `InMemoryDatabase` (arrays) | PostgreSQL 16 via `pg` |
| Cache | In-memory `SessionCache` (Map) | Redis 7 via `redis` |
| Event broker | In-process `AnalyticsEventProducer`/`Consumer` (function calls) | Redpanda (Apache Kafka protocol) via `kafkajs` |
| Search | `InternalSearchClient` (hardcoded URL) | Elasticsearch 8 via `@elastic/elasticsearch` |

All four services already declared in `docker-compose.yml` with healthchecks. This upgrade wires them in.

### 2) Existing Code Preserved Verbatim

All existing source files, vulnerability annotations, and benchmark metadata stay in place. The migration touches only config files and adds new modules — controllers, services, and routes with existing annotations remain untouched.

### 3) New Business Logic Modules

- `src/repositories/DashboardRepository.ts` — raw SQL dashboard search (A03 injection point)
- `src/repositories/AnalyticsRepository.ts` — parameterized analytics event CRUD (decoy)
- `src/services/ConfigService.ts` — raw `process.env` exposure (A05 variant injection point)
- `src/services/SyncManager.ts` — DB-to-ES sync daemon
- `src/services/ShareService.ts` — dashboard share token generation (A02 weakness)
- `src/controllers/SocialSearchController.ts` — ES-powered feed comment search
- `src/controllers/ConfigController.ts` — environment dump endpoint
- `src/controllers/DashboardController.ts` — dashboard CRUD + search
- `src/routes/dashboardRoutes.ts`, `src/routes/searchRoutes.ts`, `src/routes/configRoutes.ts` — new route modules

### 4) Enterprise UI Dashboard

`public/dashboard.html` — Chart.js real-time engagement charts, WebSocket-connected live metrics feed, Elasticsearch-powered social comment search panel.

### 5) Extend Vulnerability Surface to 8/10 OWASP Categories (11 standalone + 2 chains)

| Phase | New OWASP | Rationale |
|-------|-----------|-----------|
| 2 | A03 — SQL Injection | Dashboard search uses raw string interpolation in PG query |
| 2 | A05 — Security Misconfiguration | Unauthenticated route dumps entire `process.env` |
| 3 | A02 — Cryptographic Failures | Dashboard share token is XOR-encoded sequential ID |
| 4 | A08 — Software & Data Integrity | Kafka consumer uses unsafe deserialization on message body |
| 4 | A04 — Insecure Design | Widget config field trusted without whitelist validation |
| 5 | A07 — Identification & Auth Failures | WebSocket connection skips authentication check |

---

## Vulnerability Planting Strategy

### Per-Phase Summary

| Phase | Standalone Vulns Added | Chain Additions | Decoy Patterns |
|-------|-----------------------|-----------------|----------------|
| 1 | — | — | — |
| 2 | A03 (SQLi), A05 (env leak) | chain-02 step 1 (A04 widget config) | Parameterized AnalyticsRepository + UserRepository |
| 3 | A02 (weak crypto) | chain-02 step 2 (weak share token) | crypto.randomBytes share-link variant |
| 4 | A08 (deserialization), A04 (insecure design) | — | JSON Schema validation on metrics ingest; config whitelist on widget update |
| 5 | A07 (weak WS auth) | — | Cookie-verified REST endpoint in same controller |
| 6 | — | — | — |

---

## Chain Design

### chain-01 (preserved): Debug Config Leak -> HTTP SSRF -> Internal Search Pivot -> lateral_movement

Already exists. Three links across `DebugController`, `PreviewService`, `InternalSearchService`. Each link individually `low` or `medium`; combined impact `lateral_movement`.

### chain-02 (new): Widget Config Poison -> Weak Share Token -> data_modification

| Step | Issue | Severity | OWASP | Location |
|------|-------|----------|-------|----------|
| 1 | Widget config `renderScript` field accepted without whitelist, persists malicious payload | Low | A04 | `WidgetController.createWidget()` |
| 2 | Dashboard share token is XOR-encoded sequential ID with hardcoded key, enabling enumeration | Medium | A02 | `ShareService.generateToken()` |

**Attack narrative**: Attacker creates a widget with `config.renderScript` set to a data-exfiltrating payload. They then enumerate share tokens (predictable sequential IDs XOR'd with a hardcoded key) to discover a victim's shared dashboard URL. When the victim views their dashboard, the attacker's widget renders and modifies/skews the victim's analytics data.

**Combined Impact**: `data_modification` — Attacker writes unauthorized changes to stored analytics records via a multi-step exploit.

---

## Phase Summary

| Phase | Title | Scope | New Vulns |
|-------|-------|-------|-----------|
| 1 | Infrastructure Wiring | Replace InMemoryDatabase with PG, SessionCache with Redis, add retry logic | — |
| 2 | PostgreSQL Migration + Dashboard Search | SQL migrations, seed data, DashboardRepository, AnalyticsRepository, A03 SQLi, A05 env leak | A03, A05 |
| 3 | Elasticsearch + Share Tokens | ES index mapping, SyncManager, search endpoint, ShareService, A02 weak crypto | A02 |
| 4 | Kafka Streaming + Widget Config | Real Kafka producer/consumer, A08 deserialization, A04 insecure design, chain-02 completed | A08, A04 |
| 5 | WebSockets + Enterprise UI | WS server, live dashboard, Chart.js, A07 weak auth | A07 |
| 6 | Verification + Metadata | Exploitability checks, metadata sync, hint leakage, eval report | — |

---

## Data Model Changes

### New Tables (PostgreSQL)

```sql
CREATE TABLE dashboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  layout JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analytics_events (
  id BIGSERIAL,
  widget_id INTEGER,
  event_type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE share_tokens (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER REFERENCES dashboards(id),
  token VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### New ES Index

```
comments -- social feed comment documents with fields:
  id, widget_id, user_id, text, sentiment, timestamp
```

---

## API Endpoint Inventory

### Existing (preserved)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves client SPA portal |
| POST | `/api/auth/login` | — | Authenticates and establishes session |
| POST | `/api/auth/logout` | — | Terminates session |
| GET | `/api/auth/me` | ANY | Returns authenticated user profile |
| GET | `/api/health` | — | Container health check |
| GET | `/api/widgets` | ANY | Retrieves user dashboard widgets |
| POST | `/api/widgets` | ANY | Creates a new widget |
| POST | `/api/preview` | ANY | Generates preview for a URL (A10 SSRF) |
| GET | `/api/debug/config` | ANY | Returns debug configuration (A05) |
| GET | `/api/debug/headers` | ANY | Returns request headers |
| GET | `/internal/search/admin` | Internal token | Internal search admin (A01) |

### New (added in phases)

| Method | Path | Auth | Description | Phase |
|--------|------|------|-------------|-------|
| GET | `/api/config/env` | ANY | Returns raw process.env (A05 variant) | 2 |
| GET | `/api/dashboards` | ANY | Lists user's dashboards | 2 |
| POST | `/api/dashboards` | ANY | Creates a dashboard | 2 |
| GET | `/api/dashboards/search` | ANY | Searches dashboards by name (A03 SQLi) | 2 |
| GET | `/api/dashboards/:id/share` | ANY | Generates share token (A02 weak crypto) | 3 |
| POST | `/api/dashboards/shared/:token` | ANY | Access shared dashboard by token | 3 |
| GET | `/api/search/feed` | ANY | Searches feed comments via Elasticsearch | 3 |
| GET | `/api/search/user/:userId` | ANY | User-scoped parameterized search (decoy) | 3 |
| POST | `/api/metrics/ingest` | ANY | Ingests metrics via Kafka producer | 4 |
| GET | `/ws/live` | ANY (WS) | WebSocket live metrics stream (A07) | 5 |

---

## Security Benchmark Considerations

### Annotation Rules
- Every new standalone vulnerability gets: `// VULNERABILITY <OWASP_ID>: <brief description>`
- Every chain link gets: `// CHAIN LINK <N> (chain-<ID>): <description>`
- Existing annotations preserved verbatim

### Decoy Rules
- Place at least one decoy safe pattern adjacent to each new vulnerability
- Decoy must accept similar inputs but apply proper validation/parameterization/auth
- Document in `.vulns.decoys` and plan.md

### Metadata Update Cadence
- After each phase: update `.vulns`, `apps/typescript/app-11-social-analytics/README.md`, `scenarios.md`
- After Phase 6: generate `eval-report.md`
