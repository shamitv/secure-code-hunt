# Architecture Document — App 43: Music Streaming Playlist Service

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A JavaScript Express application representing a music streaming database where listeners can create playlists, add tracks, and import custom cover art images.

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
3 standalone vulnerabilities (A01 IDOR on playlists, A05 diagnostics info leak, A10 SSRF via cover proxy), 2 chains (lateral_movement), 2 decoys. Vulnerable endpoints: `GET /api/playlists/:id`, `GET /api/system/status`, `GET /api/cover`.
