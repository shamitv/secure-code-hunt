# Phase 03 TODO — Kafka Event Streaming + A08/A09

## Pre-requisites
- [ ] Phase 2 complete and verified
- [ ] Read vuln-inventory.md — confirm no-touch files

## Kafka Client Configuration
- [ ] Create `src/config/kafka.ts`:
  - Export `getKafka()` requiring `brokers` from appConfig
  - Export `getProducer()` — singleton kafkajs producer
  - Export `getConsumer(groupId)` — kafkajs consumer factory
  - Graceful error handling (log errors, no crash)
  - Export `ensureTopics()` to create topics on startup:
    - `audit-events`
    - `appointment-created`
    - `prescription-created`
- [ ] Confirm `KAFKA_BROKERS` in `.env.example` (already added in Phase 1)

## Audit Producer/Consumer Migration
- [ ] Rewrite `src/mq/AuditEventProducer.ts`:
  - `publish(topic, payload)` → `producer.send({ topic, messages: [{ value: JSON.stringify({ topic, ...payload }) }] })`
  - Preserve existing interface signature for backward compat
- [ ] Rewrite `src/mq/AuditEventConsumer.ts`:
  - Start consumer for `audit-events` topic
  - Store recent events in memory (existing behavior)
  - `recentEvents()` returns last 10 events

## Prescription Consumer (A08 + A09)
- [ ] Create `src/consumers/PrescriptionConsumer.ts`:
  ```typescript
  export class PrescriptionConsumer {
    constructor(private readonly pool: Pool, private readonly kafka: Kafka) {}

    async start() {
      const consumer = this.kafka.consumer({ groupId: "prescription-group" });
      await consumer.connect();
      await consumer.subscribe({ topic: "prescription-created" });
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          // VULNERABILITY A08: Deserializes payload without schema validation.
          // CHAIN LINK 2 (chain-02): Writes to prescription_log without
          // inserting audit trail entry, making prescription tampering undetectable.
          const data = JSON.parse(message.value.toString());
          await this.pool.query(
            `INSERT INTO prescription_log (appointment_id, patient_id, doctor_id, medicine, dosage, frequency)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [data.appointmentId, data.patientId, data.doctorId, data.medicine, data.dosage, data.frequency]
          );
          // NOTE: No audit log write — missing audit trail (A09)
        }
      });
    }
  }
  ```

## Notification Consumer (Decoy)
- [ ] Create `src/consumers/NotificationConsumer.ts`:
  ```typescript
  export class NotificationConsumer {
    // DECOY: Validates payload schema and logs all operations.
    async start() {
      // Subscribe to appointment-created
      // Validate message schema (required fields, types)
      // Log notification to console (safe)
      // Write to a notification_log table
    }
  }
  ```

## Event Emission
- [ ] Update `AppointmentController.book()` to emit `prescription-created` event:
  - After creating appointment, publish to `prescription-created` topic
- [ ] Update `AppointmentService.getAppointmentDetail()` to emit via Kafka:
  - Existing `auditEvents.publish()` call now goes through real Kafka
  - Do NOT modify the vulnerability code — just the producer backing

## Database Schema
- [ ] Add `prescription_log` table to `src/db/migrations/001_init.sql`

## App Wiring
- [ ] Update `src/app.ts`:
  - Import Kafka client
  - Create and start `PrescriptionConsumer`
  - Create and start `NotificationConsumer`
  - Ensure Kafka topics exist before consumers start

## Commit Cadence
- [ ] Commit after Kafka config + producer/consumer migration:
  `git add -A && git commit -m "app-14 phase-03: kafkajs client, audit producer/consumer migration"`
- [ ] Commit after PrescriptionConsumer + NotificationConsumer + events:
  `git add -A && git commit -m "app-14 phase-03: PrescriptionConsumer A08+A09, NotificationConsumer decoy, event emission"`

## Verification
- [ ] `npm run build` passes
- [ ] Kafka consumer receives audit events when appointments are accessed
- [ ] Kafka consumer receives `prescription-created` events when appointments are booked
- [ ] Prescription payload written to `prescription_log` table without audit entry
- [ ] Invalid payload (missing fields) still inserts (A08 — no schema validation)
- [ ] VULNERABILITY A08 annotation present at `PrescriptionConsumer.ts`
- [ ] CHAIN LINK 2 (chain-02) annotation present at `PrescriptionConsumer.ts`
- [ ] Decoy NotificationConsumer validates schema and logs operations
- [ ] Existing vulnerabilities (chain-01, A04) still exploitable
- [ ] No changes to no-touch files

## Phase Status Report
- [ ] Create `phase-03/status-report.md`
