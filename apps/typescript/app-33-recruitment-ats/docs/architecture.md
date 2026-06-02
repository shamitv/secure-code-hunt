# Architecture Document — App 33: Recruitment ATS Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A TypeScript Express application representing a recruitment Application Tracking System (ATS) where candidates can submit portfolios/applications and recruiters can review applicant files.

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
SQLite (in-memory). File uploads via Multer and Adm-zip.

## Security Architecture
3 standalone vulnerabilities (A01 IDOR on applications, A02 MD5 predictable API keys, A06 Zip Slip path traversal), 2 chains (data_modification), 3 decoys. Vulnerable endpoints: `POST /api/auth/api-key`, `GET /api/applications/:id`, `POST /api/applications/upload-portfolio`.
