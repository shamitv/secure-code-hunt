# Architecture Document — App 46: Charity Donation Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Flask web application representing a nonprofit platform where users can browse campaigns, make donations, and staff/administrators can manage donor list records and issue refunds.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
Flask App   (app.py)
    │
    ├── Auth middleware (session)
    ├── Route handlers (inline)
    ├── Business logic (inline)
    └── SQLite in-memory
```

## Key Files
| File | Role |
|---|---|
| `app.py` | Main server entry point, route definitions, data storage |
| `reference_guards.py` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite In-Memory → JSON Response
```

## Storage
SQLite (in-memory).

## Security Architecture
3 standalone vulnerabilities (A02 hardcoded Stripe key, A03 SQLi, A09 logging failure), 2 chains (db_exfiltration), 2 decoys. Vulnerable endpoints: `GET /api/donations/search`, `POST /api/donations/<id>/refund`.
