# App 11 — Social Media Analytics Dashboard

## Overview

A TypeScript Express analytics dashboard for campaign widgets, link previews, and internal marketing service lookups.

## Business Domain

**Marketing / Social Media** — Used by marketing professionals to track campaign performance, monitor engagement, and preview external links.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Frontend | Decoupled client-side SPA (HTML5, JS, CSS) |
| Database / Cache | In-memory repositories and session cache, PostgreSQL and Redis in Docker Compose |
| Search / Events | Internal search client, in-process event producer/consumer, Elasticsearch and Redpanda in Docker Compose |
| Containerisation | Docker, Docker Compose |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Features

- Dynamic widgets displaying real-time marketing metrics.
- Customizable dashboard layout.
- Fetch and preview metadata for external campaign links before publishing.
- Debug configuration view for support workflows.
- Internal search/service lookup simulation.

## Security Benchmarking

This application contains hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

---

## Chained Vulnerability Scenario

### Chain: "Debug Config Leak → HTTP SSRF → Internal Search Pivot → Lateral Movement"

An authenticated or unauthenticated attacker reads debug configuration to discover an internal search URL and token, then uses the preview fetcher as SSRF to reach that internal service.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Debug endpoint exposes internal search URL and service token | Medium | A05 | `src/controllers/DebugController.ts` → `getConfig()` |
| 2 | Preview service fetches caller-supplied URLs with no internal network restrictions | Medium | A10 | `src/services/PreviewService.ts` → `fetchPreview()` |
| 3 | Internal search admin endpoint trusts the leaked token and exposes service topology | Low | A01 | `src/services/InternalSearchService.ts` → `adminSearch()` |

**Attack narrative**: The attacker calls `GET /api/debug/config` to obtain `internalSearchUrl` and `internalSearchToken`, builds the internal admin URL, and submits it to `POST /api/preview`. The SSRF response returns internal search topology that would otherwise be unreachable from the public network.

**Combined Impact**: The attacker can pivot from the public analytics app into internal search/service metadata, enabling lateral movement.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves the client-side SPA portal |
| POST | `/api/auth/login` | — | Authenticates and establishes session |
| POST | `/api/auth/logout` | — | Terminates active portal session |
| GET | `/api/auth/me` | ANY | Retrieves authenticated user profile |
| GET | `/api/health` | — | Container health check |
| GET | `/api/widgets` | ANY | Retrieves user dashboard widgets |
| POST | `/api/widgets` | ANY | Creates a new widget |
| POST | `/api/preview` | ANY | Generates preview for a given URL |
| GET | `/api/debug/config` | ANY | Returns debug configuration |
| GET | `/api/debug/headers` | ANY | Returns request headers |
| GET | `/internal/search/admin` | Internal token | Internal search admin data |

---

## Running Locally

```bash
cd apps/typescript/app-11-social-analytics
npm install
npm run build
npm start
# Frontend served at http://localhost:8011
```

## Running via Docker

```bash
docker compose up --build
```
