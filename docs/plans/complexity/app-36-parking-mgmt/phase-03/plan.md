# Phase 03: Kafka + Elasticsearch Wiring

## Goal

Wire real Kafka (via `kafkajs`) and Elasticsearch (via `@elastic/elasticsearch`) clients, replacing the synchronous in-process event mock and the in-memory search stub. Plant the A10 SSRF vulnerability on the spot photo import endpoint. Remodel chain-01 to cross the async Kafka boundary. Wire chain-02 by connecting the Phase 2 debug endpoint leak (A05 step 1) to the new SSRF endpoint (A10 step 2). Carry forward all 3 existing vulnerabilities (A03, A04, A09) onto the new infrastructure.

## Scope

### Included
- [ ] Install `kafkajs`, `@elastic/elasticsearch`, `axios` npm packages
- [ ] Create `src/config/kafka.js` — Kafka client, producer, consumer setup
- [ ] Create `src/config/elastic.js` — Elasticsearch client setup and index mapping
- [ ] Create `src/producers/BookingProducer.js` — publishes booking events to Kafka topic
- [ ] Create `src/consumers/BookingConsumer.js` — processes booking events from Kafka
- [ ] Rewrite `src/search/ParkingSearchClient.js` — use real ES client, preserve A03 injection
- [ ] Remove old `src/mq/EventProducer.js`, `src/mq/EventConsumer.js`
- [ ] Create `src/services/SpotPhotoService.js` — photo import via axios
- [ ] Plant **VULN-06 (A10)**: SSRF — `POST /api/spots/:id/photo` fetches user-supplied URL without hostname validation
- [ ] Plant **Decoy D6**: `GeocodingService.resolveAddress()` validates hostname against allowlist
- [ ] Create ES sync task — reindex spots from PostgreSQL into Elasticsearch
- [ ] Wire **chain-02**: A05 debug leak (Phase 2) → A10 SSRF photo import (this phase)
- [ ] Remodel **chain-01**: spread 3 steps across 3 files (search controller, booking producer, booking consumer)
- [ ] Update `.vulns` — add VULN-06, chain-02 entries; update chain-01 locations
- [ ] Update `README.md`, `scenarios.md`

### Excluded
- JWT auth (Phase 4)
- Export service with cross-DB join (Phase 4)
- Admin dashboard UI (Phase 4)
- Any changes to Phase 1 (PostgreSQL) or Phase 2 (Redis/MongoDB) code unless required for Kafka/ES wiring

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `kafkajs` over Redpanda native SDK | Redpanda is Kafka API-compatible; `kafkajs` works against it. Maintains vendor-neutral client. |
| Separate producer and consumer modules | Producer and consumer run in the same Node process but different files/packages. Chain-01 must be detectable across these boundaries. |
| `axios` for photo import SSRF | `axios` is chosen over `fetch` because it has better error handling for internal URLs. The lack of URL validation in `SpotPhotoService.importPhoto()` is the A10 surface. |
| Keep `ParkingSearchClient` interface but replace internals | Preserves the A03 injection annotation location. The method signature stays the same; only the backend changes from mock to real ES. |
| Chain-01 step 2 moves to `BookingProducer` | The `totalCost` is now trusted inside the Kafka event payload rather than directly in the HTTP handler. Same vulnerability logic, new file location. |
| ES sync on startup, not real-time | Simpler implementation. Downstream chain link (A03 injection) is not affected by sync mechanism. |
| Photo import has admin-only route guard (session) | Limits SSRF to authenticated attackers. Matches "medium" severity — attacker must first obtain valid credentials (or chain from debug leak). |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A10 | CWE-918 | `src/services/SpotPhotoService.js` → `importPhoto()` | `POST /api/spots/:id/photo` accepts `{ imageUrl }` and calls `axios.get(imageUrl)` with no hostname validation. Attacker supplies internal service URLs. | Medium |

## Chain Planting

### chain-01 Remodel (existing chain spread across boundaries)

| Step | OWASP | Severity | Old Location | New Location | New Method |
|------|-------|----------|-------------|-------------|------------|
| 1 | A03 | Medium | `src/search/ParkingSearchClient.js` | `src/search/ParkingSearchClient.js` (same file, new ES backend) | `searchByQueryString()` |
| 2 | A04 | Medium | `src/services/BookingService.js` → `book()` | `src/producers/BookingProducer.js` | `publishBooking()` |
| 3 | A09 | Low | `src/services/BookingService.js` → `cancel()` | `src/consumers/BookingConsumer.js` | `processBooking()` |

**Annotation updates**: Move chain-01 step 2 and step 3 annotations from `BookingService.js` to `BookingProducer.js` and `BookingConsumer.js` respectively. Step 1 annotation stays in `ParkingSearchClient.js`.

### chain-02 Wiring (new chain)

| Step | OWASP | Severity | Location | Method |
|------|-------|----------|----------|--------|
| 1 | A05 | Low | `src/controllers/AdminController.js` | `debugConfig()` (created in Phase 2) |
| 2 | A10 | Medium | `src/services/SpotPhotoService.js` | `importPhoto()` (created this phase) |

**Annotation**: Add `// CHAIN LINK 1 (chain-02): ...` to `AdminController.debugConfig()`; add `// CHAIN LINK 2 (chain-02): ...` to `SpotPhotoService.importPhoto()`.

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| D6 | `src/services/GeocodingService.js` → `resolveAddress()` | Same directory as `SpotPhotoService`; also fetches external URLs via axios | Validates hostname against `['api.maps.example.com']` allowlist before making the HTTP request |

## Data Model Changes

### Kafka Topics

| Topic | Partitions | Producer | Consumer |
|-------|-----------|----------|----------|
| `parking-bookings` | 1 | `BookingProducer.publishBooking()` | `BookingConsumer.processBooking()` |
| `parking-cancellations` | 1 | `BookingController.cancel()` | `BookingConsumer.processCancellation()` |

### Elasticsearch Index

- **Index**: `parking-spots`
- **Mapping**:
  ```json
  {
    "mappings": {
      "properties": {
        "id": { "type": "integer" },
        "spotNumber": { "type": "keyword" },
        "type": { "type": "keyword" },
        "priceRate": { "type": "float" },
        "floor": { "type": "integer" },
        "isAccessible": { "type": "boolean" },
        "zone": { "type": "keyword" },
        "vehicleRestrictions": { "type": "object", "enabled": false }
      }
    }
  }
  ```

## API Contracts

### New Endpoints

| Method | Path | Auth | Handler | Description | Vuln / Chain |
|--------|------|------|---------|-------------|-------------|
| POST | `/api/spots/:id/photo` | Session (Admin) | `SpotController.importPhoto()` | Import spot photo from user-supplied URL | **A10 SSRF**, chain-02 step 2 |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| GET | `/api/spots/search` | Now queries real Elasticsearch instead of mock in-memory filter. A03 injection surface preserved. |
| POST | `/api/bookings/book` | Publishes `reservation-requested` event to Kafka topic `parking-bookings` instead of directly calling `BookingService.book()`. `totalCost` trusted in event payload (A04, chain-01 step 2). |
| POST | `/api/bookings/:id/cancel` | Publishes `cancellation-requested` event to Kafka topic `parking-cancellations`. Consumer handles persistence without audit log (A09, chain-01 step 3). |

### Removed

| File | Reason |
|------|--------|
| `src/mq/EventProducer.js` | Replaced by `src/producers/BookingProducer.js` (Kafka) |
| `src/mq/EventConsumer.js` | Replaced by `src/consumers/BookingConsumer.js` (Kafka) |

## Artifact Updates

- `.vulns`: Add VULN-06 (A10 SSRF); add chain-02 entries (2 steps); update chain-01 entries with new locations
- `README.md`: Update "API Endpoints" table; update "Chained Vulnerability Scenario" section with remodeled chain-01 and new chain-02 tables; add note about photo import SSRF
- `scenarios.md`: Add chain-02 narrative; update chain-01 narrative with new cross-boundary flow
- `package.json`: Add `kafkajs`, `@elastic/elasticsearch`, `axios`
- `docker-compose.yml`: Ensure Kafka and ES service names in environment match actual compose service names (`kafka`, `elasticsearch`)

## Dependencies on Other Phases

- **Depends on**: Phase 1 (PostgreSQL repositories functional — ES sync reads from PG; consumer inserts into PG), Phase 2 (debug endpoint created — chain-02 step 1 is already planted; Redis/MongoDB connected — consumer can clear cache)
- **Required by**: Phase 4 (JWT auth layer wraps endpoints; export service queries Kafka-produced booking data)
