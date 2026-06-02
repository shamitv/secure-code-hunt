# Architecture Document — App 49: Sports League Management

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Flask web application representing a sports league administration system, where fans can view team standings, players can view profiles, and league commissioners can manage teams and games.

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
3 standalone vulnerabilities (A01 IDOR, A03 SQLi, A05 schema leak), 2 chains (data_modification), 2 decoys. Vulnerable endpoints: `GET /api/standings/export`, `GET /api/players/search`, `GET /api/players/<id>`, `POST /api/games/<id>/score`.
