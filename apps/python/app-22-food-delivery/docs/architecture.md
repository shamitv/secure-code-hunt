# Architecture Document — App 22: Food Delivery Order System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A FastAPI application representing a food delivery portal where users can browse menu items, place orders, and check status, while payment confirmation is handled via an external webhook.

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
    └── SQLite in-memory
```

## Key Files
| File | Role |
|---|---|
| `app.py` | Main server entry point, route definitions, data storage |
| `reference_guards.py` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite In-Memory → JSON Response
```

## Storage
SQLite (in-memory).

## Security Architecture
3 standalone vulnerabilities (A02 hardcoded payment secret, A04 missing rate limits, A07 insecure session cookie flags), 2 chains (data_modification), 2 decoys. Vulnerable endpoints: `POST /api/orders`, `POST /api/payment/webhook`.
