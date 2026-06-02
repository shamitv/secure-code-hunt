# Architecture Document — App 48: Freelancer Marketplace

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A FastAPI web application representing a gig economy platform where clients can post jobs, freelancers can submit work proposals and bids, and clients can release funds from escrow.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
FastAPI App   (app.py)
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
3 standalone vulnerabilities (A01 IDOR, A04 insecure payment release, A07 predictable PRNG tokens), 2 chains (account_takeover), 2 decoys. Vulnerable endpoints: `GET /api/proposals/<id>`, `POST /api/jobs/<id>/release-payment`.
