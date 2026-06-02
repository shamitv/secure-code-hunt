# Architecture Document — App 24: Veterinary Clinic Management

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A FastAPI application representing a veterinary clinic management system, allowing pet owners to schedule appointments, and veterinarians/staff to manage pet health records and issue prescriptions.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
FastAPI App   (app.py)
    │
    ├── JWT auth middleware
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
3 standalone vulnerabilities (A02 weak JWT secret, A03 SQLi, A09 logging failure), 2 chains (data_modification), 3 decoys. Vulnerable endpoints: `GET /api/pets/search`, `POST /api/prescriptions/<id>/update`.
