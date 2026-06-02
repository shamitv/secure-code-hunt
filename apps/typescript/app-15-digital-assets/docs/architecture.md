# Architecture Document — App 15: Digital Asset Management

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A TypeScript Express application representing a digital asset manager where users can upload files, tag them, share assets, and import files from external links.

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
    └── SQLite in-memory
```

## Key Files
| File | Role |
|---|---|
| `src/index.ts` | Main server entry point, route definitions, data storage |
| `src/referenceGuards.ts` | Safe-pattern decoy code (not used by app) |
| `.vulns` | Machine-readable vulnerability manifest |

## Data Flow
```
HTTP Request → Route Handler → SQLite In-Memory → JSON Response
```

## Storage
SQLite (in-memory). File uploads via Multer disk storage.

## Security Architecture
3 standalone vulnerabilities (A01 IDOR on assets, A08 unrestricted file upload, A10 SSRF via import), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `GET /api/assets/:id`, `POST /api/assets/upload`, `POST /api/assets/import`.
