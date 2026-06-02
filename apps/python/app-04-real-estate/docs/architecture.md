# Architecture Document — App 04: Real Estate Listing Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A full-stack property catalog and prospective buyer routing platform built with Flask. The system manages property specifications, pricing, locations, external image imports, and agent contact logs.

## Architecture Diagram
```
Client Browser
    │  HTTP (REST)
    ▼
Flask App   (app.py)
    │
    ├── Auth middleware (session cookie)
    ├── Route handlers (inline)
    ├── Business logic (inline)
    └── SQLite3 in-memory
```

## Key Files
| File | Role |
|---|---|
| `app.py` | Main server entry point, route definitions, data storage |
| `reference_guards.py` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite3 In-Memory → JSON Response
```

## Storage
SQLite3 (in-memory).

## Security Architecture
3 standalone vulnerabilities (A03 OS command injection, A05 debug mode misconfiguration, A10 SSRF), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `POST /api/properties/import-image`, `POST /api/properties/analyze`.
