# Phase 04 TODO — Real Kafka Streaming + Widget Config Abuse

## Pre-requisites
- [ ] Phase 03 complete and verified
- [ ] Read `vuln-inventory.md` — confirm no-touch files
- [ ] Docker Compose running with healthy Redpanda + PostgreSQL + Elasticsearch

## Kafka Client Setup
- [ ] Create `src/config/kafka.ts`:
  - Import `{ Kafka }` from `kafkajs`
  - Export `SOCIAL_EVENTS_TOPIC = 'social-events'`
  - Create `getKafka()`: `new Kafka({ brokers: [brokerUrl], clientId: 'social-analytics' })`
  - Create `getProducer()`: connects producer, calls `createTopics` for `social-events` topic if not exists
  - Create `getConsumer(groupId)`: connects consumer, subscribes to `social-events`
  - Add `waitForKafka()`: polls `admin.listTopics()` until Redpanda responds, max 30 retries with 2s backoff
  - Export connected producer + consumer singletons

## Kafka Initialization at Startup
- [ ] Edit `src/config/db.ts` (or init sequence):
  - Add `await waitForKafka()` before DI graph setup

## Rewrite AnalyticsEventProducer
- [ ] Edit `src/mq/AnalyticsEventProducer.ts`:
  - Remove in-process consumer callback pattern
  - Inject Kafka producer via constructor
  - `publish(topic, message)`:
    ```typescript
    async publish(eventType: string, payload: Record<string, unknown>) {
      await this.producer.send({
        topic: SOCIAL_EVENTS_TOPIC,
        messages: [{ value: JSON.stringify({ event_type: eventType, payload, timestamp: new Date().toISOString() }) }]
      });
    }
    ```
  - Remove `onEvent` callback (consumer handles downstream processing now)

## Rewrite AnalyticsEventConsumer — Intentional A08 Vulnerability
- [ ] Edit `src/mq/AnalyticsEventConsumer.ts`:
  - Remove in-process stub implementation
  - Inject Kafka consumer + AnalyticsRepository + ES client + wsClients Set (empty for now)
  - `start()`:
    ```typescript
    async start() {
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          await this.handleEvent(message);
        }
      });
    }
    ```
  - `handleEvent(message)`:
    ```typescript
    // VULNERABILITY A08: eval() on Kafka message body enables arbitrary code execution.
    private async handleEvent(message: KafkaMessage) {
      const raw = message.value?.toString() || '{}';
      const event = eval(`(${raw})`);  // UNSAFE DESERIALIZATION
      // Publish crafted message: {"event_type":"comment","payload":"require('child_process').exec('rm -rf /')"}
      // eval() executes the payload as JavaScript code
      
      await this.analyticsRepo.insertEvent(
        event.widget_id ?? 0,
        event.event_type ?? 'unknown',
        event.payload ?? {}
      );
      
      // Index comment events in ES
      if (event.event_type === 'comment') {
        await this.indexComment(event);
      }
      
      // Notify WebSocket clients (Phase 5 wires this)
      this.wsClients.forEach(client => client.send(JSON.stringify(event)));
    }
    ```
  - `indexComment(event)`: formats ES document, calls `client.index()`
  - `stop()`: disconnects consumer

## Metrics Ingestion Endpoint
- [ ] Create `src/controllers/MetricsController.ts`:
  - Constructor takes `AnalyticsEventProducer`
  - `ingest(req, res)`:
    ```typescript
    async ingest(req, res) {
      const { event_type, widget_id, payload } = req.body;
      // DECOY: Validate payload schema before publishing (adjacent safe pattern)
      if (!event_type || !widget_id) {
        return res.status(400).json({ error: 'missing required fields' });
      }
      await this.producer.publish(event_type, { widget_id, payload });
      res.json({ success: true });
    }
    ```
  - This endpoint is SAFE (schema validation) — the vulnerability is on the consumer side

- [ ] Create `src/routes/metricsRoutes.ts`:
  - `POST /api/metrics/ingest` -> `MetricsController.ingest()`

## Finalize A04 Widget Config Poison
- [ ] Confirm `src/controllers/WidgetController.ts` `createWidget()`:
  - Accepts `req.body.config` without validation — already planted in Phase 2
  - Add annotation confirmation: `// CHAIN LINK 1 (chain-02): Widget config accepted without whitelist, allowing malicious payload injection.`
- [ ] Confirm decoy `updateWidget()` validates config against whitelist:
  ```typescript
  const ALLOWED_CONFIG_KEYS = ['position', 'size', 'refreshInterval', 'colorScheme'];
  // Only allowed keys pass through to update
  ```

## App Wiring
- [ ] Edit `src/app.ts`:
  - Import Kafka producer + consumer
  - Replace `AnalyticsEventProducer` constructor — inject real Kafka producer
  - Replace `AnalyticsEventConsumer` constructor — inject real Kafka consumer + AnalyticsRepository + ES client
  - Start consumer: `eventConsumer.start()`
  - Wire metrics routes: `app.use("/api/metrics", createMetricsRoutes(new MetricsController(eventProducer)))`
  - Create empty `wsClients: Set<WebSocket>` to pass to consumer (populated in Phase 5)
  - Add cleanup on SIGTERM: `eventConsumer.stop()`, producer disconnect, consumer disconnect

## Verification
- [ ] Run `docker compose up --build -d`
- [ ] Wait for all healthchecks healthy
- [ ] Verify Kafka connectivity:
  - `docker compose exec kafka rpk cluster info` -> reports healthy cluster
  - Topic `social-events` auto-created at producer startup
- [ ] Verify metrics ingestion:
  - `POST /api/metrics/ingest` with `{ event_type: "like", widget_id: 1, payload: { count: 45 } }` -> 200
  - Check Redpanda: topic has 1 message
  - Check PG: `SELECT * FROM analytics_events` -> new row inserted by consumer
- [ ] Verify A08 deserialization:
  - `POST /api/metrics/ingest` with valid-looking body but with crafted payload that exercises eval:
    `{ "event_type": "comment", "widget_id": 1, "payload": "console.log('RCE_TEST')" }` -> consumer's `eval()` executes the payload
  - Crafting a real RCE depends on Node.js context but the code path is exploitable
- [ ] Verify A04 widget config:
  - `POST /api/widgets` with `{ "title": "X", "type": "metric", "value": "1", "config": { "renderScript": "malicious()" } }` -> 200, config persisted
  - `POST /api/widgets` with `{ ... `updateWidget` ... }` -> config is whitelist-filtered (decoy working)
- [ ] Verify decoys:
  - DECOY-08: `MetricsController.ingest()` validates schema — invalid payloads rejected with 400
  - DECOY-09: `WidgetController.updateWidget()` whitelists config keys — unlisted keys stripped
- [ ] Verify existing vulns still exploitable:
  - A01, A03 SQLi, A05 debug + env, A02 weak crypto, A10 SSRF, chain-01, chain-02 step 1 all functional

## Metadata Sync
- [ ] Update `.vulns`:
  - Add VULN-09 (A08 deserialization) to `vulnerabilities`
  - Add new decoys to `decoys`
- [ ] Update `README.md`:
  - Add metrics ingest endpoint to API table
- [ ] Update `scenarios.md`:
  - A08 attack narrative (standalone)

## Regular Commits
- [ ] Commit after each major task:
  `git add -A && git commit -m "app-11 phase-04: <descriptive message>"`
- [ ] Push to remote after each commit

## Phase Status Report
- [ ] Create `phase-04/status-report.md` after completion
