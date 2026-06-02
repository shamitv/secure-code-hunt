# Architecture Document — App 31: Event Ticketing Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A TypeScript Express application representing an online event ticketing platform where users can browse events, search for shows, purchase tickets, and track reservations.

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
3 standalone vulnerabilities (A03 SQLi on search, A04 missing rate limits on booking, A07 predictable Math.random sessions), 2 chains (account_takeover), 2 decoys. Vulnerable endpoints: `GET /api/events/search`, `POST /api/tickets/book`.
