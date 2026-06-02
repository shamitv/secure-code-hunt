# Architecture Document — App 18: Peer-to-Peer Lending Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a peer-to-peer lending website where borrowers can apply for loans and administrators can manage lending contracts.

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
3 standalone vulnerabilities (A01 IDOR on contracts, A02 plaintext passwords, A04 negative interest rates), 2 chains (db_exfiltration), 2 decoys. Vulnerable endpoints: `GET /api/contracts/:id`, `POST /api/loans/apply`.
