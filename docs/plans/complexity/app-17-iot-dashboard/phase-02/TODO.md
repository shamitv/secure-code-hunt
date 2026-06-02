# Phase 02 TODO — Event Streaming + Search Integration

## Pre-requisites

- [ ] Phase 1 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files still intact after Phase 1
- [ ] PostgreSQL running with telemetry schema and seed data
- [ ] Verify `docker-compose.yml` has Redpanda and Elasticsearch services with healthchecks

## Dependencies

- [ ] Add `kafkajs` to `package.json` dependencies
- [ ] Add `@elastic/elasticsearch` to `package.json` dependencies
- [ ] Run `npm install`

## Kafka Configuration

- [ ] Create `src/config/kafka.js`:
  - [ ] Import `{ Kafka }` from `kafkajs`
  - [ ] Read `KAFKA_BROKERS` from `process.env` (fallback: `localhost:9092`)
  - [ ] Create Kafka client with `clientId: 'iot-dashboard'`
  - [ ] Export `producer` — Kafka producer instance (allowAutoTopicCreation: true)
  - [ ] Export `consumer` — Kafka consumer instance with groupId `'iot-dashboard-group'`
  - [ ] Export `createConsumer(groupId)` — factory for additional consumer groups (decoy)
  - [ ] Retry logic: connect with up to 10 retries, exponential backoff

## Kafka Consumer

- [ ] Create `src/consumers/TelemetryConsumer.js`:
  - [ ] Constructor accepts `kafkaConsumer`, `telemetryRepository`, `searchClient`
  - [ ] `start()` — subscribe to `iot-telemetry`, `iot-commands`, `iot-configs` topics; run consumer loop

  - [ ] `processMessage(topic, message)`:
    - [ ] Parse `message.value` as JSON
    - [ ] Switch on `topic`:
      - `iot-telemetry`: Parse sensor data, write to `telemetry_streams` via `telemetryRepository`
      - `iot-commands`: Log command event to ES via `searchClient.indexLog()`
      - `iot-configs`: Extract `ruleScript` field from payload
        - **Annotation**: `// VULNERABILITY A08: Consumer executes device rule scripts via eval() on untrusted input.`
        - Call `eval(payload.ruleScript)` — UNSAFE
      - **Annotation**: `// VULNERABILITY A09: No audit trail recorded for device command/telemetry event processing.`
    - [ ] Do NOT write audit log entries (intentional A09 gap)

  - [ ] `shutdown()` — disconnect consumer

- [ ] Create `src/consumers/ValidatedConsumer.js` (decoy):
  - [ ] Subscribe to `validated-telemetry` topic only
  - [ ] Validate message against JSON schema before processing
  - [ ] No `eval()` usage — safe pattern
  - [ ] Comment: `// DECOY: Schema-validated consumer on a separate topic — safe deserialization.`

## Kafka Producer (Refactor)

- [ ] Refactor `src/mq/EventProducer.js` → `src/mq/KafkaProducer.js`:
  - [ ] Constructor accepts `kafkaProducer` instance (from `src/config/kafka.js`)
  - [ ] `publish(topic, payload)` — calls `kafkaProducer.send({ topic, messages: [{ value: JSON.stringify(payload) }] })`
  - [ ] Keep old `EventProducer.js` file (no-touch — used by existing code paths) but deprecate in wiring
  - [ ] `DeviceService.runCommand()` now uses KafkaProducer instead of in-process stubs

## Elasticsearch Configuration

- [ ] Create `src/config/elasticsearch.js`:
  - [ ] Import `{ Client }` from `@elastic/elasticsearch`
  - [ ] Read `DEVICE_SEARCH_URL` from `process.env` (fallback: `http://localhost:9200/iot-devices`)
  - [ ] Create client with node URL: extract host from `DEVICE_SEARCH_URL`
  - [ ] Export client instance

- [ ] Create index initialization function:
  - [ ] Check if `iot-device-logs` index exists
  - [ ] If not, create with mappings: `device_id` (integer), `event_type` (keyword), `message` (text), `timestamp` (date)
  - [ ] Call at app startup after ES client is ready

## DeviceSearchClient (Refactor)

- [ ] Refactor `src/search/DeviceSearchClient.js`:
  - [ ] Constructor accepts `esClient` (Elasticsearch client) instead of `config`
  - [ ] `indexDevice(device)` — `esClient.index({ index: 'iot-device-logs', body: { device_id: device.id, event_type: 'device_indexed', message: 'Device registered in search index', timestamp: new Date().toISOString() } })`
  - [ ] `searchByDeviceName(name)` — **DECOY**: Uses ES `match` query (parameterized, not raw query_string)
    - Comment: `// DECOY: Uses parameterized match query — not vulnerable to query DSL injection.`
  - [ ] `searchLogs(rawQuery)` — **(Phase 3 placeholder)** This will be the vulnerable ES DSL injection endpoint in Phase 3

## App Wiring

- [ ] Refactor `src/app.js`:
  - [ ] Import `kafkaConfig` (producer, consumer), `esClient`
  - [ ] Import `TelemetryConsumer`, `KafkaProducer`, refactored `DeviceSearchClient`
  - [ ] Import `ValidatedConsumer` (decoy)
  - [ ] Instantiate `KafkaProducer` with kafka producer
  - [ ] Instantiate `TelemetryConsumer` with kafka consumer, `telemetryRepository`, `searchClient`
  - [ ] Instantiate `ValidatedConsumer` on separate consumer group
  - [ ] Pass `KafkaProducer` to `DeviceService` (instead of in-process `EventProducer`)
  - [ ] Start consumers after app.listen
  - [ ] Shutdown consumers on SIGTERM/SIGINT

- [ ] Refactor `src/index.js`:
  - [ ] Add ES index initialization before app.listen
  - [ ] Add Kafka connection + topic creation before app.listen
  - [ ] Add graceful shutdown handler

## Chain-02 Finalization

- [ ] Verify CHAIN LINK annotations in Phase 1 files:
  - [ ] `src/controllers/DeviceController.js` → `getDeviceTelemetry()` — `// CHAIN LINK 1 (chain-02)`
  - [ ] `src/services/TelemetryQueryService.js` → `queryDeviceTelemetry()` — `// CHAIN LINK 2 (chain-02)`

- [ ] Annotate chain-02 in `.vulns`:
  - [ ] `chained_attacks[]` entry with chain_id `chain-02`
  - [ ] Attack narrative: "An authenticated user exploits IDOR to read any device's telemetry, then injects SQL via the filter parameter to UNION SELECT from users/devices tables, exfiltrating credentials and device secrets."
  - [ ] Impact: `db_exfiltration`
  - [ ] Components: step 1 (A01, medium, DeviceController.getDeviceTelemetry), step 2 (A03, medium, TelemetryQueryService.queryDeviceTelemetry)

- [ ] Annotate chain-02 in app `README.md`:
  - [ ] Add chain table with step descriptions
  - [ ] Add attack narrative paragraph
  - [ ] Add combined impact statement

- [ ] Annotate chain-02 in `scenarios.md`:
  - [ ] Full step-by-step exploitation instructions

## Metadata Updates

- [ ] Update `.vulns`:
  - [ ] Add VULN-07: A08, CWE-94, `src/consumers/TelemetryConsumer.js`, `processMessage()`, medium
  - [ ] Add VULN-08: A09, CWE-778, `src/consumers/TelemetryConsumer.js`, `processMessage()`, low
  - [ ] Add chain-02 to `chained_attacks[]`
  - [ ] Add 3 new decoys (ValidatedConsumer, parameterized ES search, auth audit logging)

- [ ] Update `README.md`:
  - [ ] Chain-02 section with full table + attack narrative + combined impact
  - [ ] Update Tech Stack to reflect real kafkajs + @elastic/elasticsearch usage

- [ ] Update `scenarios.md`:
  - [ ] Full chain-02 exploitation walkthrough

## Regular Commits

- [ ] Commit after Kafka setup: `git add -A && git commit -m "app-17 phase-02: Kafka producer/consumer with Redpanda wiring"`
- [ ] Commit after consumer vulns: `git add -A && git commit -m "app-17 phase-02: A08 eval() deserialization + A09 missing audit in TelemetryConsumer"`
- [ ] Commit after Elasticsearch: `git add -A && git commit -m "app-17 phase-02: Elasticsearch indexing + search client refactor"`
- [ ] Commit after chain-02 + metadata: `git add -A && git commit -m "app-17 phase-02: chain-02 finalized (IDOR→SQLi→db_exfiltration), .vulns/README/scenarios updated"`
- [ ] Push to remote after each commit

## Phase Status Report

- [ ] Create `phase-02/status-report.md` after completion:
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

- [ ] Kafka producer connects to Redpanda broker on startup
- [ ] Kafka consumer connects and subscribes to `iot-telemetry`, `iot-commands`, `iot-configs` topics
- [ ] `POST /api/devices/command` publishes message to `iot-commands` topic (verify via consumer log)
- [ ] Consumer writes telemetry messages to `telemetry_streams` table
- [ ] Consumer processes `iot-configs` message with `ruleScript` field → `eval()` executes (verify via code path)
- [ ] Consumer does NOT produce audit log entries
- [ ] `ValidatedConsumer` processes `validated-telemetry` messages with schema validation (safe)
- [ ] Elasticsearch client connects and creates `iot-device-logs` index
- [ ] `DeviceSearchClient.indexDevice()` indexes a document to Elasticsearch
- [ ] `DeviceSearchClient.searchByDeviceName()` executes parameterized match query (safe)
- [ ] Chain-01 still exploitable (uses device refresh SSRF, not Kafka-dependent)
- [ ] Chain-02 exploitable: GET /api/devices/2/telemetry (IDOR) + POST /api/devices/1/telemetry/query with SQL injection UNION SELECT
- [ ] All existing vulnerability annotations preserved
- [ ] All new vulnerability annotations present
- [ ] Decoys present near vulnerable code paths
- [ ] `tests/contract.test.js` passes
