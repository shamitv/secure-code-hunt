# Architecture Document — App 47: Smart Home Device Manager

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A FastAPI web application representing an IoT Smart Home Hub, allowing residents to register smart home devices, execute commands, view sensor telemetry, and trigger remote firmware updates.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
FastAPI App   (app.py)
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
3 standalone vulnerabilities (A05 debug endpoint, A08 unsigned firmware, A10 SSRF), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `GET /api/debug/devices`, `GET /api/devices/sensor-data`, `POST /api/devices/{id}/firmware/update`.
