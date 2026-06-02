# Phase 03 TODO — Real-time Dashboard + WebSocket

## Pre-requisites

- [ ] Phase 2 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files still intact
- [ ] Kafka consumer running and processing telemetry messages
- [ ] Elasticsearch running and `iot-device-logs` index created

## Dependencies

- [ ] Add `ws` to `package.json` dependencies
- [ ] Run `npm install`

## WebSocket Server

- [ ] Create `src/ws/telemetryServer.js`:
  - [ ] Import `WebSocketServer` from `ws`
  - [ ] Constructor accepts `httpServer` (to attach WS to same HTTP server)

  - [ ] Initialize `WebSocketServer` on path `/ws/telemetry`:
    - [ ] **Annotation**: `// VULNERABILITY A07: WebSocket server accepts connections without authentication token validation.`
    - [ ] On `connection` event:
      - [ ] Add client to `Set<WebSocket>` for broadcasting
      - [ ] Send initial device list (current state from DB)
      - [ ] On `close` event: remove client from set
      - [ ] On `message` event: parse JSON, handle `subscribe` type (filter device_ids)

  - [ ] `broadcast(data)` — iterate clients set, send JSON string
  - [ ] `getClientCount()` — return `clients.size`
  - [ ] Export `TelemetryServer` class

- [ ] Create `src/ws/index.js`:
  - [ ] Export a `createWebSocketServer(httpServer)` factory function
  - [ ] Returns TelemetryServer instance

## Decoy: HTTP Auth Guard

- [ ] In `src/routes/deviceRoutes.js` or `src/controllers/DeviceController.js`:
  - [ ] Ensure all REST endpoints behind `requireAuth` middleware
  - [ ] Add comment near WS-related code: `// DECOY: REST endpoints require session auth — contrast with unauthenticated WebSocket.`

## WebSocket + Consumer Integration

- [ ] Refactor `src/consumers/TelemetryConsumer.js`:
  - [ ] Add `wsServer` parameter to constructor
  - [ ] After writing telemetry to PostgreSQL (`iot-telemetry` topic):
    - [ ] Call `wsServer.broadcast({ type: 'telemetry_update', device_id, device_name, temperature, humidity, timestamp })`
  - [ ] After processing command events (`iot-commands` topic):
    - [ ] Call `wsServer.broadcast({ type: 'device_status', device_id, status: 'COMMAND_SENT' })`

## Diagnostics Service + ES DSL Injection

- [ ] Create `src/services/DiagnosticsService.js`:
  - [ ] Constructor accepts `esClient` (Elasticsearch client)
  - [ ] `searchLogs(rawQuery)`:
    - [ ] **Annotation**: `// VULNERABILITY A03: Raw user-supplied query string concatenated into Elasticsearch query DSL body.`
    - [ ] Build ES query body with raw user input:
      ```js
      const body = {
        query: {
          query_string: {
            query: rawQuery  // UNSAFE — no validation or sanitization
          }
        }
      };
      ```
    - [ ] Execute `esClient.search({ index: 'iot-device-logs', body })`
    - [ ] Return results

  - [ ] `searchLogsSafe(deviceName)` (decoy):
    - [ ] Comment: `// DECOY: Uses parameterized match query — not vulnerable to query DSL injection.`
    - [ ] Use `match` query: `{ query: { match: { message: deviceName } } }`

## Diagnostics Controller + Routes

- [ ] Create `src/controllers/DiagnosticsController.js`:
  - [ ] Constructor accepts `diagnosticsService`
  - [ ] `search(req, res)` — calls `diagnosticsService.searchLogs(req.query.q)`
  - [ ] `searchSafe(req, res)` — calls `diagnosticsService.searchLogsSafe(req.query.name)`

- [ ] Create `src/routes/diagnosticsRoutes.js`:
  - [ ] Export `createDiagnosticsRoutes(diagnosticsController)`
  - [ ] `GET /search` → `diagnosticsController.search` (behind `requireAuth`)
  - [ ] `GET /search/safe` → `diagnosticsController.searchSafe` (behind `requireAuth`)

## HTML Dashboard

- [ ] Create `src/public/dashboard.html`:
  - [ ] Simple HTML5 document with embedded CSS + JavaScript
  - [ ] CSS: Dark theme, grid layout, monospace fonts (IoT/terminal aesthetic)

  - [ ] HTML structure:
    - [ ] Header: "IoT Device Dashboard" title
    - [ ] WS connection indicator (green/red dot)
    - [ ] Canvas element for telemetry chart (800×400)
    - [ ] Device status table (id, name, status, last seen)
    - [ ] Search form: `<input id="search-input">` + `<button>Search Logs</button>`
    - [ ] Results `<pre>` block
    - [ ] Command form: `<select id="device-select">` + `<input id="command-input">` + `<button>Send</button>`

  - [ ] JavaScript (inline):
    - [ ] Connect to `ws://<host>:8017/ws/telemetry`
    - [ ] On message: parse JSON, update canvas chart (line graph of temperature/humidity over time), update status table
    - [ ] Canvas chart: simple line graph — store last 50 data points per device, redraw on each update
    - [ ] Search: `fetch('/api/diagnostics/search?q=' + input)` → display in `<pre>`
    - [ ] Command: `fetch('/api/devices/command', { method: 'POST', body: JSON.stringify({ deviceId, command }) })` → display result
    - [ ] On WS close: indicator turns red, attempt reconnect every 5s

## App Wiring

- [ ] Refactor `src/app.js`:
  - [ ] Import `DiagnosticsService`, `DiagnosticsController`, `createDiagnosticsRoutes`
  - [ ] Instantiate `DiagnosticsService` with ES client
  - [ ] Instantiate `DiagnosticsController`
  - [ ] Mount diagnostics routes at `/api/diagnostics`
  - [ ] Serve static files from `src/public`: `app.use(express.static(...))`

- [ ] Refactor `src/index.js`:
  - [ ] Import `createWebSocketServer`
  - [ ] Create HTTP server with `http.createServer(app)` (instead of `app.listen()`)
  - [ ] Attach WebSocket server: `createWebSocketServer(httpServer)`
  - [ ] Pass `httpServer.listen(...)` instead of `app.listen(...)`
  - [ ] Pass `wsServer` instance to `TelemetryConsumer` constructor

## Metadata Updates

- [ ] Update `.vulns`:
  - [ ] Add VULN-09: A07, CWE-306, `src/ws/telemetryServer.js`, `constructor`, medium
  - [ ] Add VULN-10: A03, CWE-89, `src/services/DiagnosticsService.js`, `searchLogs()`, medium
  - [ ] Add 3 new decoys (REST auth guard, parameterized ES match, safe diagnostics route)

- [ ] Update `README.md`:
  - [ ] Add `/api/diagnostics/search`, `/api/diagnostics/search/safe`, `/ws/telemetry` endpoints
  - [ ] Add `/dashboard` static route
  - [ ] Update Features: "Live telemetry dashboard with WebSocket streaming"
  - [ ] Update Tech Stack: "ws (WebSocket)", "@elastic/elasticsearch"

- [ ] Update `scenarios.md`:
  - [ ] Add A07 standalone exploitation note: "Attacker connects to /ws/telemetry without any token and receives live device data"

## Regular Commits

- [ ] Commit after WS server: `git add -A && git commit -m "app-17 phase-03: WebSocket server with A07 unauthenticated connections"`
- [ ] Commit after diagnostics: `git add -A && git commit -m "app-17 phase-03: diagnostics service with A03 ES DSL injection + safe decoy"`
- [ ] Commit after dashboard: `git add -A && git commit -m "app-17 phase-03: HTML telemetry dashboard with live charts + WS integration"`
- [ ] Commit after metadata: `git add -A && git commit -m "app-17 phase-03: .vulns, README, scenarios.md updated for phase-03"`
- [ ] Push to remote after each commit

## Phase Status Report

- [ ] Create `phase-03/status-report.md` after completion:
  - What was implemented
  - Files created (count)
  - Files modified (count)
  - Vulnerabilities planted (type, location)
  - Decoys planted (location)
  - Existing vulns still intact? (yes/no)
  - Chains functional? (yes/no)
  - Tests passing? (yes/no)
  - Blockers

## Verification

- [ ] WebSocket server starts and listens on `/ws/telemetry`
- [ ] HTML dashboard served at `/dashboard`
- [ ] Browser connects to WebSocket without any auth token → receives telemetry data (A07 exploitable)
- [ ] REST endpoint `GET /api/devices/1` requires session cookie (decoy auth guard)
- [ ] `GET /api/diagnostics/search?q=*:*` returns all ES logs (raw query_string)
- [ ] `GET /api/diagnostics/search?q=message:"Smart Thermostat"` filters by message field
- [ ] `GET /api/diagnostics/search/safe?name=Thermostat` uses parameterized match query (decoy)
- [ ] Kafka consumer broadcasts telemetry to connected WebSocket clients
- [ ] Dashboard canvas chart updates in real-time as telemetry messages arrive
- [ ] Device status table shows current ONLINE/OFFLINE state
- [ ] Diagnostics search form calls vulnerable endpoint and displays raw results
- [ ] Command console sends commands via `/api/devices/command`
- [ ] Chain-01 still exploitable
- [ ] Chain-02 still exploitable
- [ ] All existing vulnerability annotations preserved
- [ ] All new vulnerability annotations present
- [ ] Decoys present near vulnerable code paths
