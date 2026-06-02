# Complexity Upgrade Plan — app-14: Telemedicine Appointment System

## Overview

Upgrade the Telemedicine Appointment System from in-memory stubs to a Docker-orchestrated polyglot system with real PostgreSQL, Redis, Kafka, Elasticsearch, MongoDB, schedule validation, prescription processing, and clinical notes. Expands OWASP coverage from 3/10 to 9/10.

## Architecture Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary DB | PostgreSQL 16 | Users, appointments, prescription log |
| Document Store | MongoDB 6 | Flexible clinical progress notes |
| Cache / Sessions | Redis 7 | Appointment cache, session blacklisting |
| Event Streaming | Kafka (Redpanda) | Audit events, prescription processing, notifications |
| Search Engine | Elasticsearch 8 | Patient and appointment notes search |

## Phase Index

| Phase | Title | Focus | New Vulns | Status |
|-------|-------|-------|-----------|--------|
| [1](phase-01/plan.md) | Infrastructure + PostgreSQL | Wire PG, schema, seeds, repos, MongoDB in compose | — | Planned |
| [2](phase-02/plan.md) | Redis + Schedule Validation | Wire Redis, cache migration, A04 vuln | A04 | Planned |
| [3](phase-03/plan.md) | Kafka + Prescription Processing | Wire kafkajs, consumers, A08+A09 vulns | A08, A09 | Planned |
| [4](phase-04/plan.md) | ES + MongoDB + Search/Notes | Wire ES, clinical notes, A03+A10+A05 vulns | A03, A10, A05 | Planned |
| [5](phase-05/plan.md) | Verification + Metadata | Sync metadata, VM testing, eval-report | — | Planned |

## Key Documents

| Document | Description |
|----------|-------------|
| [expansion-plan.md](./expansion-plan.md) | Master plan with architecture, vulnerability strategy, data model |
| [vuln-inventory.md](./vuln-inventory.md) | No-touch zone reference of existing vulnerabilities and decoys |
| [eval-report.md](./eval-report.md) | Difficulty ratings + hint leakage validation (after Phase 5) |

## OWASP Coverage

| OWASP | Before | After |
|-------|--------|-------|
| A01 | IDOR on appointments | + IDOR on clinical notes |
| A02 | Weak JWT secret | Same |
| A03 | — | ES DSL injection (new) |
| A04 | — | Schedule override bypass (new) |
| A05 | — | Debug topology leak (new) |
| A07 | JWT decode + cookie flags | Same |
| A08 | — | Unsafe Kafka deserialization (new) |
| A09 | — | Missing audit on prescription (new) |
| A10 | — | SSRF via search URL (new) |

**Coverage**: 3/10 → 9/10
