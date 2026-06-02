# Architecture Document — App 32: Customer Support Ticket System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A TypeScript Express application representing a customer support ticketing portal where customers can submit support requests, search through tickets, and view status.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
Express / TypeScript App   (src/index.ts)
    │
    ├── Auth middleware (session cookie)
    ├── Route handlers (inline)
    ├── Business logic (inline)
    └── SQLite in-memory
```

## Key Files
| File | Role |
|---|---|
| `src/index.ts` | Main server entry point, route definitions, data storage |
| `src/referenceGuards.ts` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite In-Memory → JSON Response
```

## Storage
SQLite (in-memory).

## Security Architecture
3 standalone vulnerabilities (A01 IDOR on tickets, A03 SQLi on search, A05 diagnostics info leak), 2 chains (db_exfiltration), 3 decoys. Vulnerable endpoints: `GET /api/tickets/search`, `GET /api/tickets/:id`, `GET /api/system/health`, `POST /api/admin/export`.
