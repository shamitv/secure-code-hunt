# Architecture Document — App 16: Restaurant Review Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a food critique and restaurant review portal where users can search for dining spots, write critiques, and edit reviews.

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
3 standalone vulnerabilities (A01 IDOR on review edit, A03 SQLi on search, A07 predictable Math.random sessions), 2 chains (data_modification), 3 decoys. Vulnerable endpoints: `POST /api/reviews/:id/edit`, `GET /api/restaurants/search`.
