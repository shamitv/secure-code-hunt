# Phase 04: Real Kafka Streaming + Widget Config Abuse

## Goal

Replace the in-process `AnalyticsEventProducer`/`AnalyticsEventConsumer` stubs with real `kafkajs` producer and consumer connected to Redpanda. Implement the full metrics ingestion pipeline: webhook -> Kafka topic -> consumer -> PostgreSQL (analytics_events) -> Elasticsearch (indexing). Plant A08 unsafe deserialization on the Kafka consumer. Complete the widget config abuse vulnerability (A04) started in Phase 2. The `social-events` Kafka topic should be fully operational.

## Scope

### Included
- [ ] Create `src/config/kafka.ts` — Kafka client with producer and consumer setup
- [ ] Rewrite `src/mq/AnalyticsEventProducer.ts` — real `kafkajs` producer to `social-events` topic
- [ ] Rewrite `src/mq/AnalyticsEventConsumer.ts` — real `kafkajs` consumer that:
  - Consumes `social-events` topic
  - Parses JSON event payload (unsafe deserialization path)
  - Writes to `AnalyticsRepository` (PG) and indexes in Elasticsearch
  - Pushes updates to in-memory WebSocket client list (pre-wired for Phase 5)
- [ ] Create `src/controllers/MetricsController.ts` — POST `/api/metrics/ingest` endpoint
- [ ] Create `src/routes/metricsRoutes.ts`
- [ ] **Plant A08 (Deserialization)**: Consumer uses unsafe payload handling on message value
- [ ] **Finalize A04 (Insecure Design)**: Widget config poison flow complete — config JSON accepted as-is in createWidget

### Excluded
- No WebSocket server (Phase 5) — but consumer stores client list for future push
- No UI changes (Phase 5)
- No new database tables
- No changes to annotation-bearing files

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Redpanda uses Kafka protocol — `kafkajs` works natively | No ZooKeeper, simpler config; existing docker-compose.yml already uses Redpanda |
| Kafka topic created at producer startup | Avoids manual topic creation; `createTopics` with `waitForLeaders` |
| Consumer group `analytics-group` | Ensures at-least-once delivery; single consumer for now (dev benchmark) |
| Unsafe deserialization via `eval()` on message payload | Real-world anti-pattern when consuming events from untrusted sources |
| Widget config injection finalized here | A04 design flaw (started in Phase 2) is the "enabler" for data_modification in chain-02 |
| Metrics ingestion validates JSON Schema — decoy | Same endpoint flow, different payload handling path |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A08 | CWE-502 | `src/mq/AnalyticsEventConsumer.ts` -> `handleEvent()` | Consumer deserializes Kafka message body via `eval()` or unsafe `JSON.parse` + prototype pollution via `Object.assign` on untrusted payload | Medium |
| 2 | Chain Link 1 (chain-02, finalized) | A04 | CWE-451 | `src/controllers/WidgetController.ts` -> `createWidget()` | Widget config field accepted without whitelist validation; payload persisted and executed by dashboard renderer | Low |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/controllers/MetricsController.ts` -> `ingest()` | Same controller as vulnerable consumer path; also accepts JSON body and publishes to Kafka | Uses AJV JSON Schema validation before publishing — rejects malformed payloads |
| 2 | `src/controllers/WidgetController.ts` -> `updateWidget()` | Same controller as createWidget; also accepts `config` field | Validates `config` against a hardcoded whitelist of allowed keys before saving |

## Data Model Changes

None. Uses existing tables from Phase 2.

## Kafka Topology

```
Producer                                        Consumer
--------                                        --------
POST /api/metrics/ingest                        KafkaJS consumer group "analytics-group"
  |                                                |
  v                                                v
AnalyticsEventProducer                         AnalyticsEventConsumer
  |                                                |
  v                                                |---> write to analytics_events (PG)
social-events topic ----[Kafka/Redpanda]---->      |---> index comment events in ES
                                                   |---> push to WebSocket clients (Phase 5 ready)
```

## API Contracts

### New Endpoints

| Method | Path | Auth | Description | Controller |
|--------|------|------|-------------|------------|
| POST | `/api/metrics/ingest` | ANY | Ingest social metrics event via Kafka producer | `MetricsController.ingest()` |

### A08 Attack Vector

```typescript
// VULNERABILITY A08: Consumer deserializes message body with eval(), allowing arbitrary code execution.

async handleEvent(message: KafkaMessage) {
  const rawPayload = message.value?.toString() || '{}';
  // UNSAFE: eval() executes arbitrary code in message body
  const event = eval(`(${rawPayload})`);
  // Alternative unsafe pattern: prototype pollution
  const base = {};
  Object.assign(base, JSON.parse(rawPayload)); // attacker-controlled keys override Object.prototype
  await this.analyticsRepository.insertEvent(event.widget_id, event.event_type, event.payload);
}
```

## Artifact Updates

- `apps/typescript/app-11-social-analytics/src/config/kafka.ts` — new file: create KafkaJS client, producer, consumer
- `apps/typescript/app-11-social-analytics/src/mq/AnalyticsEventProducer.ts` — rewrite with real KafkaJS
- `apps/typescript/app-11-social-analytics/src/mq/AnalyticsEventConsumer.ts` — rewrite with real KafkaJS + A08 injection
- `apps/typescript/app-11-social-analytics/src/controllers/MetricsController.ts` — new file
- `apps/typescript/app-11-social-analytics/src/routes/metricsRoutes.ts` — new file
- `apps/typescript/app-11-social-analytics/src/app.ts` — wire metrics route, start consumer
- `apps/typescript/app-11-social-analytics/.vulns` — add VULN-09 (A08), update decoys
- `apps/typescript/app-11-social-analytics/README.md` — add metrics endpoint

## Dependencies on Other Phases

- **Depends on**: Phase 2 — `AnalyticsRepository` + `analytics_events` table must exist
- **Depends on**: Phase 3 — Elasticsearch must be ready for consumer indexing
- **Required by**: Phase 5 — WebSocket clients list populated by consumer for live push
