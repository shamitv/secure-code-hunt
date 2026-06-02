# Phase 03 TODO — Elasticsearch Search Layer + Dashboard Share Tokens

## Pre-requisites
- [ ] Phase 02 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files
- [ ] Docker Compose running with healthy PostgreSQL + Elasticsearch

## ES Client Setup
- [ ] Create `src/config/elasticClient.ts`:
  - Import `Client` from `@elastic/elasticsearch`
  - Create singleton client with `ELASTICSEARCH_URL` from env
  - Add `waitForElasticsearch()`: poll `GET _cluster/health` until status yellow/green, max 30 retries with 2s backoff
  - Export `getEsClient()` getter
- [ ] Create `src/config/esMappings.ts`:
  - Export `COMMENTS_INDEX` = `"social_comments"`
  - Export `commentsMapping` object with properties: `id` (integer), `widget_id` (integer), `user_id` (integer), `text` (text), `sentiment` (keyword), `timestamp` (date)
  - Export `createCommentsIndex(client)`: calls `client.indices.create({ index: COMMENTS_INDEX, mappings: commentsMapping })` with `ignore: [400]`

## ES Initialization at Startup
- [ ] Edit `src/config/db.ts` (or create `src/config/init.ts`):
  - After PG migrations, call `waitForElasticsearch()` then `createCommentsIndex()`

## SyncManager — DB-to-ES Sync
- [ ] Create `src/services/SyncManager.ts`:
  - Constructor takes pool + ES client + intervalMs (default 30000)
  - `start()`: `setInterval` that queries `SELECT * FROM analytics_events WHERE event_type = 'comment' AND id > :lastSyncedId ORDER BY id ASC`
  - Formats results into ES bulk-index format
  - Calls `client.bulk({ refresh: true, operations })`
  - Does NOT use ES query DSL with user input — this is a system-internal daemon
- [ ] Wire SyncManager in `src/app.ts` after DI graph setup: `syncManager.start()`

## ShareService — Intentional Weak Crypto
- [ ] Create `src/services/ShareService.ts`:
  - Inject pool
  - `generateToken(dashboardId: number)`: XOR with hardcoded key, base64-encode result
    ```typescript
    // VULNERABILITY A02: XOR-encrypted sequential dashboard ID allows token enumeration.
    // CHAIN LINK 2 (chain-02): Predictable share tokens allow access to other users' dashboards.
    private readonly XOR_KEY = 0x4F;
    async generateToken(dashboardId: number): Promise<string> { ... XOR ... }
    ```
  - `validateToken(token: string)`: base64-decode, XOR-back, look up in DB
    <!-- Same annotation -->
  - `getDashboardByToken(token: string)`: validate token, fetch dashboard with PG parameterized query (decoy — parameterized within the vulnerable service)
  - `generateShareLink(entityId: number, entityType: string)`: uses `crypto.randomBytes(32).toString('hex')` — **decoy** (different entity type, crypto-safe)

## SocialSearchController — ES Query
- [ ] Create `src/controllers/SocialSearchController.ts`:
  - Constructor takes ES client
  - `search(req, res)`:
    ```typescript
    async search(req, res) {
      const { q } = req.query;
      // Constructs ES query with raw string interpolation in query_string — not a vulnerability spot
      // (this is intended to be safe — the decoy is searchByUser below)
      const result = await client.search({ index: 'social_comments', query: { match: { text: q } } });
      res.json(result.hits.hits);
    }
    ```
  - `searchByUser(req, res)`: uses parameterized `term` query on `user_id` field — **decoy** (adjacent, similar pattern, safe)

## ShareController
- [ ] Create `src/controllers/ShareController.ts`:
  - Constructor takes ShareService + AuthService
  - `share(req, res)`: get dashboardId from params, verify userId owns dashboard, call `shareService.generateToken(dashboardId)`, save token to DB, return `{ token }`
  - `access(req, res)`: get token from params, call `shareService.getDashboardByToken(token)`, return dashboard data (no ownership check — A02 chain link behavior)
  - Controller itself does NOT have vulnerability annotations — they live on ShareService. Decoy behavior: `share()` checks ownership before generating token.

## Routes
- [ ] Create `src/routes/searchRoutes.ts`:
  - `GET /api/search/feed` -> `SocialSearchController.search()`
  - `GET /api/search/user/:userId` -> `SocialSearchController.searchByUser()`
- [ ] Create `src/routes/shareRoutes.ts`:
  - `GET /api/dashboards/:id/share` -> `ShareController.share()`
  - `POST /api/dashboards/shared/:token` -> `ShareController.access()`

## App Wiring
- [ ] Edit `src/app.ts`:
  - Import ES client + wait function
  - Import new services, controllers, routes
  - Wire into DI graph
  - `app.use("/api/search", createSearchRoutes(new SocialSearchController(esClient)))`
  - `app.use("/api/dashboards", ...)` — extend existing route with share sub-routes

## Verification
- [ ] Run `docker compose up --build -d`
- [ ] Wait for all healthchecks healthy including ES
- [ ] Verify ES index: `curl http://localhost:9200/social_comments` -> returns mapping
- [ ] Verify SyncManager: wait 30s, check ES document count > 0
- [ ] Verify feed search: `GET /api/search/feed?q=engagement` -> returns matching comments
- [ ] Verify user search decoy: `GET /api/search/user/1` -> returns only user 1's comments
- [ ] Verify share token generation: `GET /api/dashboards/1/share` -> returns `{ token: "..." }`
- [ ] Verify A02 weak crypto:
  - Generate token for dashboard 1: observe base64-encoded XOR result
  - Manually craft token for dashboard 2: XOR(2, 0x4F) -> base64 encode -> `POST /api/dashboards/shared/<crafted_token>` -> returns dashboard 2
  - Confirm attacker can enumerate dashboard IDs 1..N and access all shared dashboards
- [ ] Verify chain-02 end-to-end (Phase 2 step 1 + Phase 3 step 2):
  - Step 1: POST widget with malicious `config.renderScript` -> 200 (persists)
  - Step 2: Enumerate share tokens -> access victim's dashboard -> victim's dashboard renders attacker's widget
- [ ] Verify decoys:
  - DECOY-06: `ShareService.generateShareLink()` uses `crypto.randomBytes` — generated share links are unpredictable
  - DECOY-07: `SocialSearchController.searchByUser()` uses parameterized term query — user isolation works
- [ ] Verify existing vulns still exploitable:
  - A01, A03 SQLi, A05 debug + env, A10 SSRF, chain-01 all functional

## Metadata Sync
- [ ] Update `.vulns`:
  - Add VULN-08 (A02 weak crypto) to `vulnerabilities`
  - Update chain-02 `components` array with step 2
  - Add new decoys to `decoys`
- [ ] Update `README.md`:
  - Add search + share endpoints to API table
  - Complete chain-02 section with both steps
- [ ] Update `scenarios.md`:
  - Complete chain-02 narrative

## Regular Commits
- [ ] Commit after each major task:
  `git add -A && git commit -m "app-11 phase-03: <descriptive message>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-03/status-report.md` after completion
