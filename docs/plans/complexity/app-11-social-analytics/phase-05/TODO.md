# Phase 05 TODO — WebSocket Server + Enterprise UI Dashboard

## Pre-requisites
- [ ] Phase 04 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files
- [ ] Docker Compose running with all services healthy

## WebSocket Server
- [ ] Edit `src/index.ts`:
  ```typescript
  import { createServer } from 'http';
  import { WebSocketServer } from 'ws';

  const app = await createApp();
  const server = createServer(app);  // wrap Express app in HTTP server

  const wss = new WebSocketServer({ server, path: '/ws/live' });
  // VULNERABILITY A07: WebSocket accepts any connection without session verification.

  // Pass wss clients to analytics consumer (populated via app.ts DI)
  wss.on('connection', (ws) => {
    ws.on('message', (data) => { /* handle incoming */ });
    // No cookie check, no token validation, no auth of any kind
  });
  ```
- [ ] Export `wss` for consumer access

## Wire WebSocket Clients to Consumer
- [ ] Edit `src/mq/AnalyticsEventConsumer.ts`:
  - Phase 4 already stores `wsClients: Set<WebSocket>` — verify this exists
  - Ensure each Kafka event is broadcast: `this.wsClients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(event)); })`
- [ ] Edit `src/app.ts`:
  - Pass WebSocketServer clients set to `AnalyticsEventConsumer` constructor
  - On WS connection: add client to set
  - On WS close: remove client from set

## Serve Dashboard UI
- [ ] Edit `src/app.ts` or `src/index.ts`:
  - Add route: `app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html')))`

## Build Enterprise Dashboard UI
- [ ] Create `public/dashboard.html`:
  - Include Chart.js from CDN: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>`
  - HTML structure with navbar + card grid layout (CSS grid or flexbox)
  - JavaScript sections:

  **WebSocket Live Updates:**
  ```javascript
  const ws = new WebSocket(`ws://${location.host}/ws/live`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateEngagementChart(data);
    updateEventLog(data);
  };
  ```

  **Engagement Chart (Chart.js line):**
  ```javascript
  const ctx = document.getElementById('engagementChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Engagement', data: [] }] },
    options: { responsive: true }
  });
  function updateEngagementChart(event) { /* push to datasets */ }
  ```

  **Event Distribution Chart (Chart.js bar):**
  ```javascript
  const barCtx = document.getElementById('distributionChart').getContext('2d');
  const barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: ['likes', 'comments', 'shares', 'impressions'], datasets: [{ data: [0,0,0,0] }] },
    options: { responsive: true }
  });
  ```

  **Social Feed Search Panel:**
  ```javascript
  async function searchFeed() {
    const q = document.getElementById('searchInput').value;
    const res = await fetch(`/api/search/feed?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    document.getElementById('searchResults').innerHTML = data.map(hit => 
      `<div class="result">${hit._source.text} <small>(${hit._source.sentiment})</small></div>`
    ).join('');
  }
  ```

  **Live Event Log:**
  ```javascript
  function updateEventLog(event) {
    const log = document.getElementById('eventLog');
    log.innerHTML = `<div class="event">[${new Date().toLocaleTimeString()}] ${event.event_type}</div>` + log.innerHTML;
  }
  ```

  **Widget List:**
  ```javascript
  async function loadWidgets() { /* fetch /api/widgets, render */ }
  async function createWidget() { /* POST /api/widgets with form data */ }
  ```

  **Dashboard Share:**
  ```javascript
  async function shareDashboard() {
    const dashboardId = document.getElementById('shareDashboardId').value;
    const res = await fetch(`/api/dashboards/${dashboardId}/share`);
    const data = await res.json();
    document.getElementById('shareLink').value = `${location.origin}/api/dashboards/shared/${data.token}`;
  }
  ```

## A07 Verification (No Auth on WS)
- [ ] Confirm WebSocket upgrade handler does NOT verify:
  - No cookie parsing on upgrade request
  - No session token check
  - No `verifyClient` callback with auth logic
- [ ] Annotation: `// VULNERABILITY A07: WebSocket connection skips authentication — any client can receive real-time metric streams.`
- [ ] Decoy: REST endpoint `GET /api/widgets` in `WidgetController` properly checks session cookie — same data, different transport

## Verification
- [ ] Run `docker compose up --build -d`
- [ ] Wait for all healthchecks healthy
- [ ] Access `http://localhost:8011/dashboard` -> serves enterprise dashboard UI
- [ ] Confirm Chart.js charts render (empty initially)
- [ ] Publish test metrics: `POST /api/metrics/ingest` with `{ event_type: "like", widget_id: 1, payload: { count: 45 } }` -> 200
- [ ] Confirm engagement chart updates in real-time via WebSocket
- [ ] Confirm event log updates in real-time
- [ ] Test feed search: type query, hit search, results load from Elasticsearch
- [ ] Test widget CRUD: create widget via dashboard form -> appears in list
- [ ] Verify A07 weak WS auth:
  - Open dashboard in browser A — see live metrics
  - Open dashboard in browser B (incognito, no login) — connect to WS directly via `new WebSocket('ws://localhost:8011/ws/live')` -> receives same metric stream without any auth
  - Confirmed: any client can subscribe to live metrics
- [ ] Verify decoy:
  - DECOY-10: `GET /api/widgets` without cookie -> returns 401/empty (auth required)
  - Same data available via WS without auth — A07 confirmed
- [ ] Verify existing vulns still exploitable:
  - All Phase 1--4 vulns functional
  - A03 SQLi on dashboard search accessible from dashboard UI search
  - A02 share token enumeration accessible from share panel
- [ ] Verify original `/` SPA still functional

## Metadata Sync
- [ ] Update `.vulns`:
  - Add VULN-10 (A07 WS weak auth) to `vulnerabilities`
  - Add new decoy to `decoys` (WidgetController REST cookie check)
- [ ] Update `README.md`:
  - Add `/dashboard` + WS endpoint to API table
  - Add enterprise dashboard to features list

## Regular Commits
- [ ] Commit after each major task:
  `git add -A && git commit -m "app-11 phase-05: <descriptive message>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-05/status-report.md` after completion
