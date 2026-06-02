# Architecture Document — App 37: Agricultural Crop Planner

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a smart agriculture planning platform where farmers can track crops, import farm layout blueprints, and verify weather reports.

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
SQLite (in-memory). File uploads handled by Multer (in-memory) and Adm-zip.

## Security Architecture
3 standalone vulnerabilities (A05 diagnostics info leak, A06 Zip Slip path traversal, A10 SSRF via weather proxy), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `GET /api/system/config`, `POST /api/crop-plan/import-layout`, `GET /api/weather/proxy`.
