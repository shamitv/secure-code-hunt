# Architecture Document — App 01: E-Commerce Product Catalog API

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.
>
> For an expanded reference covering all 5 expansion phases and detailed per-service route maps, see [docs/tech/architecture.md](tech/architecture.md).

## System Overview

A multi-service retail catalog and order fulfillment platform built with **Python (Flask)** and a decoupled **TypeScript (React)** supplier frontend. The system manages product inventories, customer orders, supplier relationships, and report generation across three backend microservices and one frontend application.

**Business Domain**: Retail / E-Commerce — used by customers to browse/search items, manage carts, and place orders; catalog managers to register products; suppliers to manage listings and generate reports; system administrators to manage cache, scheduler, feature flags, and webhooks.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│              Supplier Portal (TypeScript/React SPA)   │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP (REST)
                       ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Catalog  │  │Reporting │  │  Supplier    │
│  Service  │  │ Service  │  │  Portal API  │
│  (Flask)  │  │ (Flask)  │  │  (Flask)     │
│  :8081    │  │ :5002    │  │  :5003       │
└────┬──────┘  └────┬─────┘  └──────┬───────┘
     │              │               │
     └──────────────┼───────────────┘
                    ▼
      ┌─────────────────────────┐
      │     SQLite (in-memory)  │
      │ (catalog, orders, users,│
      │  reports, suppliers)    │
      └─────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.x, Flask (3 microservices) |
| Frontend (Customer) | Decoupled SPA (HTML5, Vanilla JS, CSS) |
| Frontend (Supplier) | TypeScript, React 18, Vite |
| Database | SQLite `:memory:` |
| Search / MQ | Elasticsearch query client, Kafka-style event publisher/consumers |
| Cache | In-memory `dict` with file-based persistence |
| Auth | Flask signed session cookies |
| Containerization | Docker, Docker Compose |

## Service Architecture

### Catalog Service (:8081)
Primary product catalog and order fulfillment. Handles customer-facing product browsing, cart/checkout, order lifecycle, product lifecycle management, and bulk upload.

**Location**: `services/catalog-service/`

```
routes/           → Flask Blueprints (HTTP routing)
controllers/      → Request handling, session/role validation
services/         → Business logic, search, MQ publishing, lifecycle
repositories/     → Data access (SQL, Elasticsearch)
models/           → SQLAlchemy ORM models, lifecycle models
config/           → Settings, DB initialization
consumers/        → Kafka-style event consumers (billing, email, search)
static/           → Customer-facing SPA (HTML, JS, CSS)
```

### Reporting Service (:5002)
Asynchronous report generation and export. Handles scheduled report jobs, caching, webhook delivery, feature flag management, and administrative operations.

**Location**: `services/reporting-service/`

```
routes/           → Report admin routes
controllers/      → Admin console endpoints for cache, scheduler, flags, webhooks
services/
  ├── cache_service.py      → In-memory + file-based report caching
  ├── feature_flags.py      → JSON-file-backed flag store
  ├── scheduler.py          → In-process cron-style job scheduler
  └── webhook_retry.py      → Exponential backoff delivery
models/           → ReportJob model
exports/          → Generated report output files (CSV, JSON)
```

### Supplier Portal API (:5003)
Supplier-facing REST API for managing report generation, webhook configuration, and supplier profile data.

**Location**: `services/supplier-portal-api/`

```
routes/           → report_bp, auth_bp, portal_bp (Flask Blueprints)
controllers/      → Report, auth, portal controllers
services/         → Report generation, dashboard, auth services
models/           → Supplier, ReportDefinition
```

### Supplier Portal Frontend (TypeScript/React)
React-based SPA for supplier users to view dashboards, manage reports, configure webhooks, and access admin console.

**Location**: `apps/typescript/app-01-supplier-portal/`

See [that app's docs/architecture.md](../../typescript/app-01-supplier-portal/docs/architecture.md) for full details.

## Shared Libraries

| Package | Contents |
|---|---|
| `packages/domain/` | Shared DTOs (Product, Category, Order, Supplier), enums, validation rules |
| `packages/utils/` | Pagination parsing, response formatting, date/time helpers |

## Data Layer

| Entity Group | Tables | Owner |
|---|---|---|
| Catalog | products, categories, skus, prices | Catalog Service |
| Orders | orders, order_items, invoices | Catalog Service |
| Users | users, roles, sessions | Catalog Service |
| Lifecycle | product_lifecycle, lifecycle_history | Catalog Service |
| Reports | report_jobs, report_definitions, scheduled_reports | Reporting Service |
| Suppliers | suppliers, supplier_products, webhook_configs | Supplier Portal API |

**Storage**: SQLite `:memory:` (recreated on restart), in-memory cache dict with JSON file persistence.

## Message Flow

```
Order Event → Kafka-style publisher → Consumers:
                                       ├── billing (mutates invoice state)
                                       ├── email (notification)
                                       └── search (reindex)
Report Request → Async job queue → Report generation → Webhook delivery (exponential backoff)
```

## Deployment

| Service | Port |
|---|---|
| Catalog Service | 8081 |
| Reporting Service | 5002 |
| Supplier Portal API | 5003 |
| Supplier Portal UI (Vite dev) | 3000 |

Single `docker-compose.yml` with the catalog service container (others can be added).

## Security Architecture

- **10 standalone vulnerabilities** covering OWASP Top 10 A01–A10:
  - A01 ×2: IDOR on order detail, bulk upload trusts supplierId from body
  - A02: Hardcoded Flask signing secret
  - A03: SQL injection surfaces
  - A04: Weak supplier ID validation
  - A05: Security misconfiguration
  - A06: XSS in React SPA (dangerouslySetInnerHTML)
  - A07: Accept-any-password supplier login
  - A08: Pickle deserialization via cache restore
  - A09: Missing audit logging
  - A10: SSRF in webhook delivery
- **2 chained attacks**: chain-01 (user enumeration → session forgery → catalog modification → data_modification), chain-02 (weak supplier ID validation → bulk upload catalog poisoning → data_modification)
- **5 decoys**: scoped product listing, parameterized login query, role-gated product creation, scoped employee detail endpoint, allowlist-validated supplier report
- See `.vulns` for the complete manifest.
