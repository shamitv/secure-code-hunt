# Architecture Document — App 40: Pet Adoption Portal

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a pet adoption database where clients can browse pets, submit adoption applications, and configure display layouts.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
Express App   (src/index.js)
    │
    ├── Auth middleware (session cookie)
    ├── Route handlers (inline)
    ├── Business logic (inline)
    └── SQLite in-memory
```

## Key Files
| File | Role |
|---|---|
| `src/index.js` | Main server entry point, route definitions, data storage |
| `src/referenceGuards.js` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite In-Memory → JSON Response
```

## Storage
SQLite (in-memory).

## Security Architecture
3 standalone vulnerabilities (A03 SQLi on pet search, A05 diagnostics info leak, A08 eval() deserialization), 2 chains (account_takeover), 2 decoys. Vulnerable endpoints: `GET /api/pets/search`, `GET /api/system/diagnostics`, `POST /api/pets/layout`.
