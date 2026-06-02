# App 14 (telemedicine) — Complexity Upgrade Expansion Plan

## Overview

Upgrade the Telemedicine Appointment System from an in-memory Express monolith to a Docker-orchestrated polyglot system with real PostgreSQL, Redis, Apache Kafka, Elasticsearch, MongoDB, and new business logic (schedule validation, prescription processing, clinical notes).

**Current**: TypeScript/Express, 22 source files, 7 endpoints, in-memory storage, stub search/audit clients
**Target**: Same codebase extended, ~35 source files, 12+ endpoints, all 5 Docker services wired

> **Non-goals / Constraints**
> - Do **not** remove or fix any planted vulnerability listed in [vuln-inventory.md](./vuln-inventory.md).
> - Add new code with realistic patterns, including **decoy safe code** near vulnerable-looking code.
> - Add 1–2 new standalone vulnerabilities per phase + new chained scenarios.
> - Update `.vulns`, `README.md`, `scenarios.md` after each phase.

---

## Current State

| Property | Value |
|----------|-------|
| App ID | `app-14` |
| Language | TypeScript |
| Framework | Express |
| Standalone vulns | 4 (A07 JWT decode, A01 IDOR, A02 weak secret, A07 cookie flags) |
| Chain scenarios | 1 (chain-01: Weak JWT → IDOR → DB Exfiltration) |
| Decoys | 3 (BCrypt hashing, doctorNotes stripping, referenceGuards.ts) |
| OWASP gaps | A03, A04, A05, A08, A09, A10 uncovered |
| Docker compose | Exists (PG, Redis, Kafka, ES) but **zero services actually wired** |

---

## Architecture Changes

### 1) Wire existing infrastructure (already in compose)

| Component | Current | Target |
|-----------|---------|--------|
| PostgreSQL | Declared in compose, unused | Real `pg` pool → replace `InMemoryMedicalDatabase` |
| Redis | Declared in compose, unused | Real `ioredis` → replace in-memory `AppointmentCache`, add session blacklisting |
| Kafka/Redpanda | Declared in compose, unused | Real `kafkajs` → replace in-process `AuditEventProducer/Consumer` |
| Elasticsearch | Declared in compose, unused | Real `@elastic/elasticsearch` → replace stub `PatientSearchClient` |

### 2) Add new infrastructure component

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MongoDB | `mongodb` driver | Flexible clinical progress notes (symptoms, diagnosis, prescriptions) |

### 3) New business logic modules

- `src/services/ScheduleValidator.ts` — doctor availability & overlap checks (A04 vulnerability)
- `src/services/ClinicalNoteService.ts` — MongoDB CRUD for clinical notes (A01 IDOR extension)
- `src/consumers/PrescriptionConsumer.ts` — Kafka consumer for prescription processing (A08, A09)
- `src/consumers/NotificationConsumer.ts` — Kafka consumer for appointment notifications (decoy)
- `src/controllers/ClinicalNoteController.ts` — REST endpoints for clinical notes
- `src/controllers/DebugController.ts` — internal topology exposure (A05)

---

## Vulnerability Planting Strategy

### Per-Phase Summary

| Phase | Standalone Vulns Added | Chain Additions | Decoy Patterns |
|-------|-----------------------|-----------------|----------------|
| 1 | — | — | — |
| 2 | 1 (A04) | chain-02 step 1 | Strict schedule validator method |
| 3 | 2 (A08, A09) | chain-02 step 2 | Parameterized notification consumer |
| 4 | 3 (A03, A10, A05) | chain-03 step 1, step 2 | Parameterized ES query, URL allowlist |
| 5 | — | — | — |

**Total new**: 6 standalone vulnerabilities, 2 new chain scenarios
**OWASP coverage after expansion**: A01, A02, A03, A04, A05, A07, A08, A09, A10 — 9/10 covered
**Not covered**: A06 (Vulnerable & Outdated Components)

---

## New Chain Scenarios

### chain-02: Schedule Override → Missing Audit → Undetected Prescription Tampering

**Impact**: `data_modification`

| Step | OWASP | Description | Location | Severity |
|------|-------|-------------|----------|----------|
| 1 | A04 | Schedule validator skips overlap check when `allow_override=true` | `src/services/ScheduleValidator.ts` → `validateSlot()` | Medium |
| 2 | A09 | Prescription consumer writes to DB without audit trail entries | `src/consumers/PrescriptionConsumer.ts` → `processPrescription()` | Medium |

**Attack narrative**: An attacker passes `allow_override=true` to book an overlapping appointment, then the prescription Kafka consumer processes the resulting event and writes prescription data to PostgreSQL without any audit log entry, making the unauthorized prescription untraceable.

### chain-03: Debug Topology Leak → SSRF Internal Pivot

**Impact**: `lateral_movement`

| Step | OWASP | Description | Location | Severity |
|------|-------|-------------|----------|----------|
| 1 | A05 | Debug endpoint exposes internal service URLs/hosts without auth | `src/controllers/DebugController.ts` → `status()` | Low |
| 2 | A10 | Patient search accepts arbitrary `search_url` parameter for SSRF | `src/search/PatientSearchClient.ts` → `searchPatients()` | Medium |

**Attack narrative**: An attacker hits `GET /api/internal/status` to retrieve Elasticsearch, Redis, Kafka, and MongoDB internal hostnames, then pivots to those services via the SSRF-vulnerable `search_url` parameter in patient search.

---

## Data Model Changes

### PostgreSQL (additions)

| Table | Purpose |
|-------|---------|
| `users` | Migrated from in-memory seed data |
| `appointments` | Migrated from in-memory, adds `time_slot` column |
| `prescription_log` | Records prescribed medicines per appointment (new) |

### MongoDB (new)

| Collection | Purpose |
|------------|---------|
| `clinical_notes` | Flexible documents: symptoms, diagnosis, prescribed medicines, doctor comments |

### Redis (new keys)

| Key Pattern | Purpose |
|-------------|---------|
| `appointment:{id}` | Appointment cache entry |
| `session:blacklist:{token}` | Invalidated session tokens |

---

## API Endpoint Inventory

Existing endpoints preserved; new ones added:

| Method | Path | Auth | Phase | Description |
|--------|------|------|-------|-------------|
| POST | `/api/auth/register` | None | exist | Register patient |
| POST | `/api/auth/login` | None | exist | Login, set token cookie |
| POST | `/api/auth/logout` | Session | exist | Logout, blacklist token |
| GET | `/api/auth/me` | Session | exist | Current user |
| GET | `/api/health` | None | exist | Health check |
| GET | `/api/appointments` | Session | exist | List appointments |
| GET | `/api/appointments/:id` | Session | exist | Appointment detail (IDOR) |
| POST | `/api/appointments` | Session | 2 | Book appointment (A04) |
| GET | `/api/clinical-notes/:id` | Session | 4 | Get clinical note (IDOR) |
| POST | `/api/clinical-notes` | Session | 4 | Create clinical note |
| GET | `/api/patients/search` | Session | 4 | Search patients (A03, A10) |
| GET | `/api/internal/status` | None | 4 | Debug topology leak (A05) |

---

## Deliverables Checklist

- [ ] Vuln inventory documented ([vuln-inventory.md](./vuln-inventory.md))
- [ ] Expansion plan (this document)
- [ ] Phase 1: Infrastructure + PostgreSQL Migration
- [ ] Phase 2: Redis + Schedule Validation (A04)
- [ ] Phase 3: Kafka + Prescription Processing (A08, A09)
- [ ] Phase 4: ES + MongoDB + Search/Notes (A03, A10, A05)
- [ ] Phase 5: Verification + Metadata
- [ ] `eval-report.md` created
- [ ] `.vulns`, `README.md`, `scenarios.md` updated after each phase
- [ ] `.env.example` added
- [ ] All existing vulnerabilities preserved and verified on VM
- [ ] Git commit after each major task and each phase
- [ ] `docs/plans/complexity/README.md` status updated
