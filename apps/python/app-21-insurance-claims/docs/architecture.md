# Architecture Document — App 21: Insurance Claims Processor

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A web application for processing insurance policies and claims, allowing customers to file claims and adjusters/admins to review and approve payouts.

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
3 standalone vulnerabilities (A01 IDOR, A03 SQLi, A09 logging failure), 2 chains (data_modification), 3 decoys. Vulnerable endpoints: `GET /api/claims/search`, `GET /api/claims/<claim_id>`, `POST /api/claims/<claim_id>/approve`.
