# Architecture Document — App 03: Banking Transaction Service

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A full-stack banking ledger and fund transfer microservice built with FastAPI. The system manages user accounts, routing logs, available ledger balances, and transaction wires.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
FastAPI App   (app.py)
    │
    ├── Auth middleware (session cookie)
    ├── Route handlers (inline)
    ├── Business logic (inline)
    └── mongomock in-memory store
```

## Key Files
| File | Role |
|---|---|
| `app.py` | Main server entry point, route definitions, data storage |
| `reference_guards.py` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → mongomock In-Memory Store → JSON Response
```

## Storage
In-memory mock MongoDB via mongomock.

## Security Architecture
3 standalone vulnerabilities (A02 hardcoded API keys, A03 NoSQL injection, A04 missing rate limiting), 2 chains (data_modification), 2 decoys. Vulnerable endpoints: `GET /api/accounts/balance`, `GET /api/transactions`, `POST /api/transfers`.
