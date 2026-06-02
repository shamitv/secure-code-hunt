# Phase 02 TODO — Redis + MongoDB Wiring

## Pre-requisites
- [ ] Phase 1 complete and verified (PostgreSQL wired, repositories functional)
- [ ] Re-read `vuln-inventory.md` — confirm no-touch files intact
- [ ] All Phase 1 verifications passing

## Dependencies
- [ ] Add `redis` to `package.json` (`npm install redis`)
- [ ] Add `mongodb` to `package.json` (`npm install mongodb`)

## Docker Compose
- [ ] Add MongoDB service to `docker-compose.yml`:
  ```yaml
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: parkingdb
    healthcheck:
      test: ["CMD-SHELL", "mongosh --eval 'db.runCommand(\"ping\").ok' --quiet"]
      interval: 10s
      timeout: 5s
      retries: 10
  ```
- [ ] Add `mongodb` to `web.depends_on` with `condition: service_healthy`
- [ ] Add `REDIS_URL` and `MONGO_URI` to `web.environment`

## Config Layer
- [ ] Create `src/config/redis.js`:
  - Import `redis` (`createClient` from `redis` v4+)
  - Create client using `REDIS_URL` from `appConfig.js`
  - Connect on import; handle `error` event with reconnect logic
  - Export `redisClient`
- [ ] Create `src/config/mongo.js`:
  - Import `MongoClient` from `mongodb`
  - Create client using `MONGO_URI` from `appConfig.js`
  - Connect on import; export `mongoClient` and `mongoDb = mongoClient.db()`
- [ ] Update `src/config/appConfig.js`:
  - Add `REDIS_URL` (default: `redis://redis:6379/36`)
  - Add `MONGO_URI` (default: `mongodb://mongodb:27017/parkingdb`)
  - Add `KAFKA_BROKERS` and `ELASTICSEARCH_URL` config keys (will be wired in Phase 3; needed here for debug endpoint)

## Session Cache
- [ ] Rewrite `src/cache/SessionCache.js`:
  - Replace in-memory `Map` with Redis `set`/`get`/`del`
  - `set(token, userData)`: `redisClient.setEx('session:' + token, 86400, JSON.stringify(userData))`
  - `get(token)`: `redisClient.get('session:' + token)` → parse JSON
  - `del(token)`: `redisClient.del('session:' + token)`
- [ ] Remove old `Map`-based storage

## MongoDB Setup
- [ ] Create `migrations/003-mongo-setup.js`:
  - Create `lot_layouts` collection with indexes on `lotId` and `zone`
  - Create `pricing_rules` collection with index on `ruleType`
  - Insert seed layout documents for A-101, A-102, B-201, B-202
  - Insert seed pricing rules (1 peak-hour rule, 1 holiday rule)
- [ ] Add MongoDB migration call to `src/app.js` startup sequence

## Lot Layout & Pricing Services
- [ ] Create `src/services/LotLayoutService.js`:
  - `getByLotId(db, lotId)` → `db.collection('lot_layouts').findOne({ lotId })`
  - `create(db, layout)` → `db.collection('lot_layouts').insertOne(layout)`
- [ ] Create `src/services/PricingRulesService.js`:
  - `getActiveRules(db)` → `db.collection('pricing_rules').find({}).toArray()`
  - `create(db, rule)` → `db.collection('pricing_rules').insertOne(rule)`

## Admin Controller + Debug Endpoint (VULN-05)
- [ ] Create `src/controllers/AdminController.js`:
  - `debugConfig(req, res)`:
    - **No auth check** — returns `200` with:
      ```json
      {
        "DATABASE_URL": "...",
        "REDIS_URL": "...",
        "MONGO_URI": "...",
        "KAFKA_BROKERS": "...",
        "ELASTICSEARCH_URL": "..."
      }
      ```
    - Annotate: `// VULNERABILITY A05: Unauthenticated debug endpoint exposes internal service topology.`
  - `createLayout(req, res)`: validates admin session, calls `LotLayoutService.create()`
- [ ] Create `src/routes/adminRoutes.js`:
  - `router.get('/debug', adminController.debugConfig)` — **NO auth middleware**
  - `router.post('/layouts', authMiddleware, adminOnly, adminController.createLayout)`

## Spot Controller Update
- [ ] Update `src/controllers/SpotController.js`:
  - Add `getLayout(req, res)`: calls `LotLayoutService.getByLotId(mongoDb, spot.spot_number)`, returns layout JSON
- [ ] Update `src/routes/spotRoutes.js`:
  - Add `router.get('/:id/layout', spotController.getLayout)`

## Decoy D5 — Health Endpoint Safety
- [ ] Verify `src/controllers/HealthController.js` → `health()` returns ONLY `{ status: 'ok' }`
- [ ] Ensure no environment variables, service URLs, or internal config leaks into health response

## App Factory Update
- [ ] Update `src/app.js` `createApp()`:
  - Import and initialize Redis client
  - Import and initialize MongoDB client
  - Run MongoDB migration
  - Inject `sessionCache` (now Redis-backed) into auth middleware
  - Inject `mongoDb` into layout/pricing services
  - Register new `adminRoutes`

## .env.example Update
- [ ] Add to `.env.example`:
  ```
  REDIS_URL=redis://localhost:6379/36
  MONGO_URI=mongodb://localhost:27017/parkingdb
  KAFKA_BROKERS=localhost:9092
  ELASTICSEARCH_URL=http://localhost:9200
  ```

## Artifact Updates
- [ ] Update `.vulns`:
  - Add VULN-05: `owasp_id: "A05"`, `category: "Security Misconfiguration"`, `severity: "medium"`, `cwe: "CWE-200"`, `location: "src/controllers/AdminController.js"`, `method: "debugConfig"`
  - Add D5: `location: "src/controllers/HealthController.js"`, `description: "Health endpoint returns only { status: 'ok' } with no internal detail."`
- [ ] Update `apps/javascript/app-36-parking-mgmt/README.md`:
  - Update "Tech Stack" to include Redis and MongoDB
  - Add new endpoints to "API Endpoints" table
  - Add VULN-05 note in "Security Benchmarking"
- [ ] Update `apps/javascript/app-36-parking-mgmt/scenarios.md`:
  - Add VULN-05 description

## Regular Commits
- [ ] Commit cadence:
  1. `app-36 phase-02: add redis+mongodb dependencies, add mongo to docker-compose`
  2. `app-36 phase-02: create redis and mongo config clients, rewrite SessionCache`
  3. `app-36 phase-02: plant VULN-05 (A05 debug endpoint) + decoy D5`
  4. `app-36 phase-02: add MongoDB lot layout service + spot layout endpoint`
  5. `app-36 phase-02: update .env.example, .vulns, README, scenarios.md`

## Phase Status Report
- [ ] Create `phase-02/status-report.md`:
  - Files created / modified counts
  - VULN-05 planted (location, method)
  - Decoy D5 verified
  - Existing vulns (VULN-01–04) still intact
  - Existing decoys (D1–D4) still present
  - Chain-01 steps still functional within current in-memory Kafka mock
  - Docker compose: all 6 services healthy
  - Tests passing

## Verification
- [ ] `docker compose up --build` — all 6 services (web, postgres, redis, kafka, elasticsearch, mongodb) healthy
- [ ] `GET /api/admin/debug` — returns 200 with all internal service URLs (**NO auth required**)
- [ ] `GET /api/health` — returns `{ status: 'ok' }` only (Decoy D5)
- [ ] `POST /api/auth/login` with valid credentials — session stored in Redis (`redis-cli KEYS session:*`)
- [ ] `POST /api/auth/logout` — session removed from Redis
- [ ] `POST /api/admin/layouts` with admin session + valid layout JSON → stored in MongoDB
- [ ] `GET /api/spots/A-101/layout` — returns layout document from MongoDB
- [ ] All Phase 1 endpoints still functional against PostgreSQL
- [ ] VULN-01 (A03 ES injection) still exploitable via mock search client
- [ ] VULN-02 (A04 client pricing) still exploitable via booking endpoint
- [ ] VULN-03 (A09 missing audit) still exploitable via cancellation endpoint
- [ ] VULN-04 (A01 IDOR) still exploitable via booking list/detail endpoints
- [ ] `node tests/contract.test.js` — passes or updated for new file counts
- [ ] `.vulns` updated with VULN-05 and D5
- [ ] `README.md` and `scenarios.md` updated
- [ ] `.env.example` has all 6 variables
