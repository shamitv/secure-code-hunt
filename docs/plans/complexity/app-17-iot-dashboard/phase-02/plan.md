# Phase 02: Event Streaming + Search Integration

## Goal

Replace the in-process EventProducer/EventConsumer stubs with real Redpanda (Kafka API) via `kafkajs`.
Replace the no-op `DeviceSearchClient` with real Elasticsearch indexing and search queries via
`@elastic/elasticsearch`. Plant A08 unsafe deserialization and A09 missing audit in the Kafka consumer.
Finalize chain-02 (IDOR → SQLi → db_exfiltration) with end-to-end exploitability.

## Scope

### Included

- [ ] Add `kafkajs` and `@elastic/elasticsearch` to `package.json`
- [ ] Create `src/config/kafka.js` — Kafka client, producer, and consumer setup
- [ ] Create `src/config/elasticsearch.js` — Elasticsearch client with index configuration
- [ ] Create `src/consumers/TelemetryConsumer.js` — real Kafka consumer
- [ ] Plant A08 unsafe deserialization (`eval()`) in consumer
- [ ] Plant A09 missing audit trail in consumer
- [ ] Refactor `src/mq/EventProducer.js` — publish to Redpanda topics
- [ ] Refactor `src/search/DeviceSearchClient.js` — real ES indexing and search
- [ ] Wire consumer to write telemetry to PostgreSQL (from Phase 1)
- [ ] Create decoy safe consumer on a different topic
- [ ] Create decoy parameterized search query
- [ ] Finalize chain-02 (add A01 + A03 chain link annotations; write full attack narrative)
- [ ] Update `.vulns`, `README.md`, `scenarios.md`

### Excluded

- WebSocket server + HTML dashboard (Phase 3)
- Elasticsearch DSL injection vulnerability (Phase 3 — this phase establishes the search infrastructure)

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Use `kafkajs` (not `node-rdkafka`) | Pure JavaScript implementation; no native build dependencies; simpler for benchmark |
| One consumer group per app instance | Single-node deployment; no need for consumer group coordination |
| Consumer writes telemetry to PostgreSQL via `TelemetryRepository` | Same repository from Phase 1; keeps data flow consistent |
| ES index created at startup | Single-node ES; no index lifecycle management needed |
| Consumer `eval()` for "dynamic device rules" | Realistic IoT feature — devices may send configuration scripts; `eval()` is a clear A08 target |
| Schema-validated consumer as decoy | Nearby decoy on separate topic with JSON schema validation before processing |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Method | Description | Severity |
|---|---|---|---|---|---|---|---|
| 1 | New standalone | A08 | CWE-94 | `src/consumers/TelemetryConsumer.js` | `processMessage()` | Consumer calls `eval()` on the `ruleScript` field of device config payloads from Kafka | medium |
| 2 | New standalone | A09 | CWE-778 | `src/consumers/TelemetryConsumer.js` | `processMessage()` | Consumer processes device command/telemetry events without writing to an audit log | low |
| 3 | Existing (chain-02) | A01 | CWE-639 | `src/controllers/DeviceController.js` | `getDeviceTelemetry()` | CHAIN LINK annotation added (already planted in Phase 1) | medium |
| 4 | Existing (chain-02) | A03 | CWE-89 | `src/services/TelemetryQueryService.js` | `queryDeviceTelemetry()` | CHAIN LINK annotation added (already planted in Phase 1) | medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|---|---|---|
| 1 | `src/consumers/ValidatedConsumer.js` (new) | Consumes messages from a `validated-telemetry` topic — same directory as vulnerable consumer | Messages are validated against a JSON schema before processing; no `eval()` usage |
| 2 | `src/search/DeviceSearchClient.js` → `searchByDeviceName()` | Accepts user input for search query — looks similar to injection | Uses parameterized ES query with `match` rather than raw query_string concatenation |
| 3 | `src/services/AuthService.js` → `register()` / `login()` | Auth events are published via EventProducer — looks like they might skip audit too | Auth events are explicitly logged to console AND published with `{ type: 'audit', ... }` metadata |

## Data Model Changes

No new database tables. The consumer writes to existing `telemetry_streams` table (Phase 1).

### New Kafka Topics

| Topic | Purpose | Consumer |
|---|---|---|
| `iot-telemetry` | Raw device sensor data (temperature, humidity) | `TelemetryConsumer` |
| `iot-commands` | Device command events | `TelemetryConsumer` |
| `iot-configs` | Device configuration updates (contains `ruleScript` field) | `TelemetryConsumer` (vuln: eval) |
| `validated-telemetry` | Safe telemetry stream (decoy) | `ValidatedConsumer` (decoy) |

### New Elasticsearch Index

```
Index: iot-device-logs
Mapping: { device_id: integer, event_type: keyword, message: text, timestamp: date }
```

## API Contracts

No new HTTP endpoints in this phase. The consumer processes Kafka messages and writes to
PostgreSQL; the search client indexes device events to Elasticsearch.

### Refactored Existing Endpoints

- `POST /api/devices/command` — now publishes command to Redpanda `iot-commands` topic (instead of in-process consumer)
- `POST /api/devices/refresh` — status refresh results indexed to Elasticsearch (if device data changes)

## Artifact Updates

- `.vulns`: Add VULN-07 (A08), VULN-08 (A09); add chain-02 full definition to `chained_attacks[]`; add 3 new decoys
- `README.md`: Update chain-02 section with full attack narrative; update API endpoint descriptions for Kafka-backed command flow
- `scenarios.md`: Full chain-02 attack narrative with step-by-step exploitation instructions

## Dependencies on Other Phases

- **Depends on**: Phase 1 — requires PostgreSQL repositories (`TelemetryRepository`) for consumer to write telemetry
- **Required by**: Phase 3 — WebSocket server subscribes to Kafka consumer events to broadcast live telemetry
