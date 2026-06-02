# Phase 03: Real-time Dashboard + WebSocket

## Goal

Add a WebSocket server that broadcasts live device telemetry to connected clients. Build an HTML
telemetry dashboard with live charts, device status panel, and diagnostics search. Plant A07
unauthenticated WebSocket and A03 Elasticsearch DSL injection vulnerabilities.

## Scope

### Included

- [ ] Add `ws` to `package.json`
- [ ] Create `src/ws/telemetryServer.js` — WebSocket server (unauth)
- [ ] Integrate WebSocket server with HTTP server in `src/index.js`
- [ ] Wire Kafka consumer to broadcast telemetry to WebSocket clients
- [ ] Create `src/public/dashboard.html` — HTML telemetry dashboard
- [ ] Add `GET /api/diagnostics/search` endpoint (ES DSL injection)
- [ ] Create `src/services/DiagnosticsService.js` — ES search with raw query DSL
- [ ] Plant A07 unauth WebSocket annotation + decoy
- [ ] Plant A03 ES DSL injection annotation + decoy
- [ ] Update `.vulns`, `README.md`, `scenarios.md`

### Excluded

- Additional chain scenarios (chain-01 and chain-02 are sufficient for benchmark)
- React/SPA frontend (HTML dashboard served from Express is sufficient)
- Real charting library (use Canvas API or inline SVG; avoid pulling in heavy deps)

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Raw `ws` library (not Socket.IO) | Simpler API; fewer abstraction layers; clearer WebSocket protocol demonstration |
| WebSocket auth intentionally missing | A07 vulnerability requirement — no token validation on connection |
| HTML dashboard uses inline script + Canvas | No build step needed; served directly from Express `static` middleware |
| ES DSL injection in DiagnosticsService | Natural feature for an IoT dashboard — admins search device logs with custom queries |
| Telemetry broadcast via consumer callback | Consumer calls `wsServer.broadcast()` after writing to PostgreSQL — keeps data flow single-direction |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Method | Description | Severity |
|---|---|---|---|---|---|---|---|
| 1 | New standalone | A07 | CWE-306 | `src/ws/telemetryServer.js` | `onConnection()` | WebSocket server accepts connections without any authentication token or session validation | medium |
| 2 | New standalone | A03 | CWE-89 | `src/services/DiagnosticsService.js` | `searchLogs()` | Raw user-supplied query string concatenated into Elasticsearch query DSL body | medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|---|---|---|
| 1 | `src/controllers/DeviceController.js` → `refresh()` | HTTP endpoint that also accepts user input — looks like it could lack auth (like the WS) | Protected by `requireAuth` middleware; requires valid session cookie |
| 2 | `src/search/DeviceSearchClient.js` → `searchByDeviceName()` | Accepts user-supplied name for ES search — looks like DSL injection target | Uses parameterized `match` query; no raw query_string concatenation |
| 3 | `src/routes/diagnosticsRoutes.js` → `searchLogsSafe()` (decoy route on same file) | Same route file as vulnerable endpoint — looks similar | Calls `DeviceSearchClient.searchByDeviceName()` which uses safe parameterized query |

## Data Model Changes

No new database tables or indices.

### WebSocket Message Protocol

**Server → Client (broadcast)**:
```json
{
  "type": "telemetry_update",
  "device_id": 1,
  "device_name": "Smart Thermostat",
  "temperature": 23.5,
  "humidity": 65.0,
  "timestamp": "2026-05-28T12:00:00Z"
}
```

**Server → Client (device_status)**:
```json
{
  "type": "device_status",
  "device_id": 1,
  "status": "ONLINE"
}
```

**Client → Server** (unused by dashboard; potential attack surface):
```json
{
  "type": "subscribe",
  "device_ids": [1, 2]
}
```

## API Contracts

### New Endpoints

**GET `/api/diagnostics/search`** (Auth: Session cookie)
- **Vulnerability**: A03 ES DSL injection — user-supplied `q` query parameter injected into raw ES query
- **Query params**: `?q=<raw query string>`
- **Response**: `{ query, hits: [...], total: N }`

**GET `/api/diagnostics/search/safe`** (Auth: Session cookie)
- **Decoy**: Parameterized search — uses `match` query with sanitized input
- **Query params**: `?name=<device name>`
- **Response**: `{ query, hits: [...], total: N }`

**WS `/ws/telemetry`** (No auth)
- **Vulnerability**: A07 — any client can connect and receive live telemetry broadcasts
- **Protocol**: Raw WebSocket (RFC 6455)
- **Messages**: Server pushes telemetry updates as JSON frames

### New Static Routes

- `/dashboard` → serves `src/public/dashboard.html`

## HTML Dashboard Features

The dashboard served at `/dashboard` should include:

1. **Live Telemetry Chart**: Canvas-based line chart showing temperature + humidity over time for all devices
2. **Device Status Panel**: Table showing device ID, name, status (ONLINE/OFFLINE), last seen timestamp
3. **Diagnostics Search Form**: Text input + submit button → calls `/api/diagnostics/search?q=<input>` and displays results
4. **Command Console**: Text input + device ID selector → sends commands via `/api/devices/command`
5. **WebSocket Connection Indicator**: Green/red dot showing WS connection status

## Artifact Updates

- `.vulns`: Add VULN-09 (A07), VULN-10 (A03 — ES); add 3 new decoys
- `README.md`: Update API endpoint table with new endpoints; update Tech Stack; update Features list
- `scenarios.md`: No new chains — update existing chains if affected by new infrastructure

## Dependencies on Other Phases

- **Depends on**: Phase 2 — Kafka consumer sends telemetry to both PostgreSQL and WebSocket broadcaster
- **No downstream dependencies** (Phase 4 is verification only)
