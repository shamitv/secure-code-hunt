# Architecture Document — App 45: Corporate Travel & Expense System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A web API for managing corporate travel reservations and employee expense submissions. It allows employees to submit expense reports for travel, meals, and lodging, and enables administrators/accountants to review, approve, or reject these submissions.

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
SQLite (in-memory).

## Security Architecture
3 standalone vulnerabilities (A01 IDOR on expenses, A03 SQLi on search, A07 unsalted MD5 passwords), 2 chains (db_exfiltration), 2 decoys. Vulnerable endpoints: `GET /api/expenses/:id`, `GET /api/expenses/search`.
