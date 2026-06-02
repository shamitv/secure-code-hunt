# Architecture Document — App 25: Supply Chain Inventory Tracker

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Flask web application representing a supply chain inventory system, allowing operators and administrators to track warehouses, inventory levels, and import inventory records from supplier APIs.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
Flask App   (app.py)
    │
    ├── Auth middleware (session)
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
3 standalone vulnerabilities (A06 vulnerable PyYAML, A07 plaintext passwords, A10 SSRF), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `GET /api/supplier/check-api`, `POST /api/inventory/import`.
