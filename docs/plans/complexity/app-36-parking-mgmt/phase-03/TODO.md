# Phase 03 TODO — Kafka + Elasticsearch Wiring

## Pre-requisites
- [ ] Phase 1 and Phase 2 complete and verified
- [ ] All 5 services (web, postgres, redis, kafka, elasticsearch, mongodb) healthy in Docker Compose
- [ ] Re-read `vuln-inventory.md` — confirm no-touch files, chain-01 annotations, existing vulns

## Dependencies
- [ ] Add `kafkajs` to `package.json` (`npm install kafkajs`)
- [ ] Add `@elastic/elasticsearch` to `package.json` (`npm install @elastic/elasticsearch`)
- [ ] Add `axios` to `package.json` (`npm install axios`)

## Kafka Config
- [ ] Create `src/config/kafka.js`:
  - Import `{ Kafka }` from `kafkajs`
  - Create `kafka` client using `KAFKA_BROKERS` from `appConfig.js`
  - Create and export `kafkaProducer` (connect on startup)
  - Create and export `kafkaConsumer` factory (connect per consumer group)
  - Define topics: `parking-bookings`, `parking-cancellations`

## Elasticsearch Config
- [ ] Create `src/config/elastic.js`:
  - Import `{ Client }` from `@elastic/elasticsearch`
  - Create `esClient` using `ELASTICSEARCH_URL` from `appConfig.js`
  - Define index name constant: `PARKING_SPOTS_INDEX = 'parking-spots'`
  - Export `esClient` and `PARKING_SPOTS_INDEX`
- [ ] Create `src/config/es-mapping.js`:
  - Export function `ensureEsIndex(esClient)`:
    - Check if `parking-spots` index exists
    - If not, create with mapping from plan
    - Index all spots from PostgreSQL `spots` table
    - Log "Elasticsearch index ready"

## Rewrite ParkingSearchClient (Preserve A03 Injection)
- [ ] Rewrite `src/search/ParkingSearchClient.js`:
  - Replace in-memory filtering with real ES client call
  - **Preserve the injection surface**: concatenate user `query` parameter into `query_string` clause
  - Method `searchByQueryString(esClient, query)`:
    ```js
    // CHAIN LINK 1 (chain-01): User input is embedded directly in Elasticsearch query_string syntax.
    // VULNERABILITY A03: Elasticsearch query injection can broaden spot searches and reveal pricing.
    const body = {
      query: {
        query_string: {
          query: query,  // user input directly in DSL — NOT parameterized
          default_field: '*'
        }
      }
    };
    return esClient.search({ index: PARKING_SPOTS_INDEX, body });
    ```
  - **No sanitization**, **no escaping** of the `query` parameter

## Kafka Producer
- [ ] Create `src/producers/BookingProducer.js`:
  - `publishBooking(producer, bookingData)`:
    ```js
    // CHAIN LINK 2 (chain-01): Booking price is trusted from the client instead of recalculated.
    // VULNERABILITY A04: Client-controlled totalCost permits zero or negative cost bookings.
    await producer.send({
      topic: 'parking-bookings',
      messages: [{ value: JSON.stringify(bookingData) }]
    });
    ```
  - Note: `bookingData.totalCost` is passed through from HTTP request body — no recalculation

## Kafka Consumer
- [ ] Create `src/consumers/BookingConsumer.js`:
  - `processBooking(pool, message)`:
    - Parse `message.value` as JSON
    - Extract `{ userId, spotId, durationHours, totalCost, status }`
    - Insert booking into PostgreSQL via `BookingRepository.create()`
    - **Do NOT emit any audit event** — this is A09 and chain-01 step 3
    - Annotate:
      ```js
      // CHAIN LINK 3 (chain-01): Cancellation is persisted without a security audit event.
      // VULNERABILITY A09: Critical booking mutations lack audit logging.
      ```
  - `processCancellation(pool, message)`:
    - Parse `message.value` as JSON
    - Update booking status to `CANCELLED` in PostgreSQL
    - **Do NOT emit any audit event**
  - `startConsumer(kafka, pool)`:
    - Create consumer group `booking-processor`
    - Subscribe to `parking-bookings` and `parking-cancellations`
    - Run message processing loop

## Booking Controller Refactor (for Kafka)
- [ ] Update `src/controllers/BookingController.js`:
  - `book(req, res)`: validate input, call `BookingProducer.publishBooking(producer, { ...req.body, userId: req.session.userId })` — return `202 Accepted`
  - `cancel(req, res)`: validate input, call `BookingProducer.publishCancellation(producer, { bookingId: req.params.id, userId: req.session.userId })` — return `202 Accepted`
  - Remove direct `BookingService.book()` / `BookingService.cancel()` calls — these now flow through Kafka
  - **Preserve IDOR in `listAll()` and `getById()`** (VULN-04 from Phase 1)
- [ ] Remove `src/services/BookingService.js` (or extract remaining logic to consumer)

## Remove Old Event System
- [ ] Delete `src/mq/EventProducer.js`
- [ ] Delete `src/mq/EventConsumer.js`

## SSRF: Spot Photo Import (VULN-06)
- [ ] Create `src/services/SpotPhotoService.js`:
  - `importPhoto(imageUrl)`:
    ```js
    // VULNERABILITY A10: Spot photo import fetches user-supplied URL without hostname validation.
    // CHAIN LINK 2 (chain-02): Attacker supplies internal service URL learned from debug endpoint.
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return { size: response.data.length, contentType: response.headers['content-type'] };
    ```
  - **No hostname validation** — accepts any URL including internal services
- [ ] Update `src/controllers/SpotController.js`:
  - Add `importPhoto(req, res)`: calls `SpotPhotoService.importPhoto(req.body.imageUrl)`, returns `200` with photo metadata
- [ ] Update `src/routes/spotRoutes.js`:
  - Add `router.post('/:id/photo', authMiddleware, adminOnly, spotController.importPhoto)`

## Decoy D6: Geocoding Service
- [ ] Create `src/services/GeocodingService.js`:
  - `resolveAddress(address)`:
    ```js
    // Safe: validates hostname against allowlist before fetching
    const url = new URL(`https://api.maps.example.com/geocode?address=${encodeURIComponent(address)}`);
    if (!['api.maps.example.com'].includes(url.hostname)) throw new Error('invalid host');
    return axios.get(url.toString());
    ```
  - This is the safe counterpart to `SpotPhotoService.importPhoto()` — same directory, similar pattern, but with allowlist

## Chain-02 Annotation
- [ ] Add to `src/controllers/AdminController.js` → `debugConfig()`:
  ```js
  // CHAIN LINK 1 (chain-02): Unauthenticated debug endpoint leaks internal service topology.
  ```
- [ ] Add to `src/services/SpotPhotoService.js` → `importPhoto()`:
  ```js
  // CHAIN LINK 2 (chain-02): Attacker supplies internal Redis/Kafka/ES URL from debug leak as imageUrl.
  ```

## App Factory Update
- [ ] Update `src/app.js` `createApp()`:
  - Initialize Kafka producer (connect)
  - Start Kafka consumer
  - Run `ensureEsIndex()` on startup
  - Inject `esClient` into `ParkingSearchClient`
  - Inject `kafkaProducer` into `BookingController`
  - Inject `pgPool` into `BookingConsumer`
  - Register updated routes

## Artifact Updates
- [ ] Update `.vulns`:
  - Add VULN-06: `owasp_id: "A10"`, `cwe: "CWE-918"`, `severity: "medium"`, `location: "src/services/SpotPhotoService.js"`, `method: "importPhoto"`
  - Add chain-02 with 2 components (step 1 in AdminController, step 2 in SpotPhotoService), `impact: "lateral_movement"`
  - Update chain-01 components: step 2 location → `src/producers/BookingProducer.js`, step 3 location → `src/consumers/BookingConsumer.js`
  - Add D6 to `decoys`
- [ ] Update `apps/javascript/app-36-parking-mgmt/README.md`:
  - Update "Tech Stack" — add `kafkajs`, `@elastic/elasticsearch`, `axios`
  - Update "API Endpoints" — add photo import; mark book/cancel as async (202 instead of 201)
  - Update "Chained Vulnerability Scenario" — replace old chain-01 table with new cross-boundary version; add chain-02 table
- [ ] Update `apps/javascript/app-36-parking-mgmt/scenarios.md`:
  - Replace chain-01 narrative with new cross-boundary attack flow (HTTP → Kafka → consumer)
  - Add chain-02 narrative (debug → SSRF → internal Redis)

## Regular Commits
- [ ] Commit cadence:
  1. `app-36 phase-03: add kafkajs, elasticsearch, axios dependencies`
  2. `app-36 phase-03: create kafka and elasticsearch config clients`
  3. `app-36 phase-03: rewrite ParkingSearchClient with real ES (preserve A03)`
  4. `app-36 phase-03: create BookingProducer + BookingConsumer, refactor booking flow to Kafka`
  5. `app-36 phase-03: plant VULN-06 (A10 SSRF) + decoy D6 (GeocodingService)`
  6. `app-36 phase-03: wire chain-02, update chain-01 annotations, remove old mq/`
  7. `app-36 phase-03: update .vulns, README, scenarios.md`

## Phase Status Report
- [ ] Create `phase-03/status-report.md`:
  - Files created / modified counts
  - VULN-06 planted
  - Chain-01 remodeled (3 steps in 3 files across async boundary)
  - Chain-02 wired (2 steps across container boundary)
  - Decoy D6 planted
  - All existing vulns (VULN-01–05) still exploitable
  - All existing decoys (D1–D5) still present
  - Docker compose: all services healthy; Kafka topics created; ES index populated

## Verification
- [ ] `docker compose up --build` — all 6 services healthy; Kafka broker reachable; ES cluster green
- [ ] `GET /api/spots/search?q=*:*` — returns all spots from ES index (A03 injection broadens results)
- [ ] `GET /api/spots/search?q=Standard` — returns only Standard spots
- [ ] `POST /api/bookings/book` with `{ spotId: 3, durationHours: 2, totalCost: 0 }` — returns `202 Accepted`
- [ ] Wait 2 seconds; `GET /api/bookings` — zero-cost booking persisted with status ACTIVE (A04 + A09 through Kafka)
- [ ] `POST /api/bookings/1/cancel` — returns `202 Accepted`; booking status updated but no audit log emitted
- [ ] `GET /api/admin/debug` — returns internal URLs (chain-02 step 1 working)
- [ ] `POST /api/spots/A-101/photo` with admin session + `{ imageUrl: "http://redis:6379/PING" }` — request reaches internal Redis (chain-02 step 2 working; visible in Redis container logs)
- [ ] Decoy D6: `GeocodingService.resolveAddress("123 Main St")` — validates hostname, succeeds for allowed host, fails for others
- [ ] All Phase 1 and Phase 2 vulns still exploitable (IDOR, debug endpoint)
- [ ] `node tests/contract.test.js` — updated and passing
- [ ] `.vulns` updated with VULN-06, chain-02, updated chain-01
- [ ] `README.md` and `scenarios.md` updated with remodeled chain-01 and new chain-02
