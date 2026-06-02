# Architecture Document — App 42: Construction Project Tracker

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a construction tracking database where managers can upload contracts, apply design templates, and review budget statistics.

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
3 standalone vulnerabilities (A01 IDOR on contracts, A08 eval() deserialization, A09 missing deletion logs), 2 chains (account_takeover), 2 decoys. Vulnerable endpoints: `GET /api/contracts/:id`, `POST /api/contracts/template`, `POST /api/contracts/:id/delete`.
