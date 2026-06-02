# Phase 05: WebSocket Server + Enterprise UI Dashboard

## Goal

Integrate a WebSocket server (`ws`) into the Express app for real-time analytics metric pushes. Build a production-style enterprise dashboard UI (`public/dashboard.html`) with Chart.js real-time graphs, WebSocket-connected live updates, and an Elasticsearch-powered social feed comment search panel. Plant A07 weakness: WebSocket upgrade handler accepts any connection without session/auth verification.

## Scope

### Included
- [ ] Create WebSocket server on same HTTP server as Express via `ws` library
- [ ] Implement `/ws/live` endpoint for real-time metric push
- [ ] Wire WebSocket to AnalyticsEventConsumer: consumer pushes events to all connected WS clients
- [ ] Build `public/dashboard.html` with:
  - Chart.js line graph for engagement metrics (real-time updates via WS)
  - Chart.js bar chart for event-type distribution
  - Social feed comment search panel (calls `GET /api/search/feed`)
  - Widget list with create/edit (calls existing `/api/widgets` endpoints)
  - Dashboard share panel (calls `/api/dashboards/:id/share`)
- [ ] **Plant A07 (Weak WS Auth)**: `/ws/live` upgrade handler skips auth verification
- [ ] Ensure existing page at `/` still works; `/dashboard` serves the new UI

### Excluded
- No new database changes
- No new Kafka topics
- No changes to existing annotation-bearing files

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| WebSocket upgrade on same HTTP server | Simpler Docker Compose setup — single port; no separate WS listener needed |
| Consumer directly pushes to WS clients | Avoids extra pub/sub layer; matches real-time analytics dashboard pattern |
| Chart.js over D3 | Smaller bundle, simpler API — sufficient for benchmark visualization |
| `/dashboard` for new UI, `/` preserved for original SPA | Non-breaking; both UIs coexist |
| Cookie-based auth on REST, no auth on WS | Intentional A07 design — mirrors common "forgot to secure WebSocket" anti-pattern |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A07 | CWE-306 | `src/index.ts` or `src/app.ts` -> WS upgrade handler | WebSocket `/ws/live` connection accepts any client without verifying session cookie or auth token. Attacker connects and receives real-time metrics from all users' widgets. | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | Same `/ws/live` route — `verifyClient` callback checks cookie | Looks like the same unauthenticated WS endpoint | Actually verifies the session cookie against Redis before upgrading — but this is the **A07 planting site** being "fixed" by a decoy? |
|  | **Correction**: The decoy is the REST endpoint `GET /api/widgets` in the same controller (WidgetController) which properly verifies session cookies | Both handle user-specific data | REST endpoint requires valid session; WS endpoint does not |

## WebSocket Architecture

```
Browser (dashboard.html)
  |
  |--- ws://host:8011/ws/live  (A07: no auth check)
  |      ^
  |      | push on each event
  |      |
AnalyticsEventConsumer.handleEvent()
  |
  |---> writes PG (analytics_events)
  |---> indexes ES (comments)
  |---> wsClients.forEach(c => c.send(event))  // Phase 4 wired this
```

## UI Components

```
public/dashboard.html
  |-- Navbar: App name, user info
  |-- Row 1:
  |   |-- Card: Engagement Over Time (Chart.js line, WS-updated)
  |   |-- Card: Event Distribution (Chart.js bar, WS-updated)
  |-- Row 2:
  |   |-- Card: Social Feed Search (input + results from /api/search/feed)
  |   |-- Card: Live Event Log (scrollable list, WS-appended)
  |-- Row 3:
  |   |-- Card: My Widgets (list from /api/widgets + create form)
  |   |-- Card: Share Dashboard (generates token via /api/dashboards/:id/share)
```

## API Contracts

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | — | Serves enterprise dashboard UI |
| GET (WS) | `/ws/live` | NONE (A07) | WebSocket live metrics stream — **no auth verification** |

## Artifact Updates

- `apps/typescript/app-11-social-analytics/src/index.ts` — extend with WS server on same HTTP server
- `apps/typescript/app-11-social-analytics/src/app.ts` — add WS upgrade handler + `/dashboard` route
- `apps/typescript/app-11-social-analytics/public/dashboard.html` — new file: enterprise dashboard UI
- `apps/typescript/app-11-social-analytics/.vulns` — add VULN-10 (A07 WS weak auth)
- `apps/typescript/app-11-social-analytics/README.md` — update endpoints + feature list

## Dependencies on Other Phases

- **Depends on**: Phase 4 — consumer already wires `wsClients` for push
- **Depends on**: Phase 3 — ES search panel calls existing search endpoint
- **Depends on**: Phase 2 — dashboard share panel uses share token endpoints
