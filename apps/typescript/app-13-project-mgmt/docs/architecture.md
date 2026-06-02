# Architecture Document — App 13: Project Management Tool

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A full-stack project tracking platform built with Express / TypeScript. The system manages team boards, user stories, action items, and organization access controls.

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
    └── In-memory object store
```

## Key Files
| File | Role |
|---|---|
| `src/index.ts` | Main server entry point, route definitions, data storage |
| `src/referenceGuards.ts` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → In-Memory Object Store → JSON Response
```

## Storage
In-memory JavaScript object store.

## Security Architecture
3 standalone vulnerabilities (A01 IDOR on boards, A03 Stored XSS, A09 missing audit logs), 2 chains (account_takeover), 1 decoy. Vulnerable endpoints: `GET /api/boards/:id`, `POST /api/boards/:id/tasks`, `PUT /api/boards/:id/permissions`.
