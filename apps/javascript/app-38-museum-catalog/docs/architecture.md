# Architecture Document — App 38: Museum Collection Catalog

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing an art museum catalog where users can browse exhibits, write in the public visitor guestbook, and delete items from catalog archives.

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
3 standalone vulnerabilities (A01 IDOR on exhibits, A03 Stored XSS in guestbook, A09 missing deletion logs), 2 chains (db_exfiltration), 2 decoys. Vulnerable endpoints: `GET /api/exhibits/:id`, `GET /api/guestbook`, `POST /api/exhibits/:id/delete`.
