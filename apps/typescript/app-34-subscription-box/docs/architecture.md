# Architecture Document — App 34: Subscription Box Service

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A TypeScript Express application representing a subscription box ordering portal where users can browse subscription packages, manage their subscription states, and update profile settings.

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
3 standalone vulnerabilities (A03 SQLi on search, A07 unsalted MD5 passwords, A09 missing audit logs), 2 chains (account_takeover), 3 decoys. Vulnerable endpoints: `GET /api/packages/search`, `POST /api/subscriptions/update`.
