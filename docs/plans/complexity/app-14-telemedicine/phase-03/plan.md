# Phase 03: Kafka Event Streaming + Prescription Processing (A08, A09)

## Goal

Wire up real kafkajs producer/consumer to replace in-process `AuditEventProducer/Consumer`. Add `PrescriptionConsumer` with A08 (unsafe deserialization) and A09 (missing audit) vulnerabilities. Add `NotificationConsumer` as decoy. Plant chain-02 step 2.

## Scope

### Included
- Create `src/config/kafka.ts` (kafkajs client)
- Rewrite `AuditEventProducer.ts` to use kafkajs producer
- Rewrite `AuditEventConsumer.ts` to use kafkajs consumer
- Create `PrescriptionConsumer.ts` — consumes `prescription-created` events
- Create `NotificationConsumer.ts` — consumes `appointment-created` events (decoy)
- Emit Kafka events from appointment booking and detail endpoints
- Plant VULNERABILITY A08, VULNERABILITY A09 (chain-02 step 2)
- Add `prescription_log` table to PG schema

### Excluded
- Elasticsearch wiring (Phase 4)
- MongoDB clinical notes (Phase 4)
- Debug endpoint (Phase 4)

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A08 | CWE-502 | `src/consumers/PrescriptionConsumer.ts` → `processPrescription()` | Deserializes Kafka message payload via `JSON.parse()` without schema validation, writes raw values to DB | Medium |
| 2 | Chain Link 2 (chain-02) | A09 | CWE-778 | Same location | Prescription consumer writes to `prescription_log` table without inserting audit trail entry | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/consumers/NotificationConsumer.ts` → `processNotification()` | Also processes Kafka events from the same broker | Validates payload against a schema before writing; logs all operations |

## Data Model Changes

### New PostgreSQL Table

```sql
CREATE TABLE prescription_log (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  medicine VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Artifact Updates

- `.vulns`: Add VULN-06 (A08), VULN-07 (A09 as chain-only) entries
- `README.md`: Update chain-02 table, add prescription log table note
- `scenarios.md`: Update chain-02 narrative

## Dependencies on Other Phases

- **Depends on**: Phase 2 (POST /api/appointments emits Kafka events)
- **Required by**: Phase 4 (clinical notes may emit events)
