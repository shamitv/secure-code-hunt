# Architecture Document — App 20: Fitness Tracking API

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a fitness tracking dashboard where runners can register, record activities, modify settings, and view workout details.

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
3 standalone vulnerabilities (A01 IDOR on activities, A06 prototype pollution, A07 predictable Math.random sessions), 2 chains (db_exfiltration), 2 decoys. Vulnerable endpoints: `GET /api/activities/:id`, `POST /api/user/settings`.
