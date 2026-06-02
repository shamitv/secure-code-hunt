# Architecture Document — App 10: Telecom Billing Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A Spring Boot telecom billing system for customer accounts, usage records, invoices, payments, and plan pricing. Supports PostgreSQL for persistence, Elasticsearch for usage search indexing, and Redpanda (Kafka API) for audit event streaming.

## Architecture Diagram

```
HTTP Client
    │
    ▼
┌──────────────────┐
│  Spring Boot App │  (port 8082 / mapped to 8010)
│  Controller →    │
│  Service →       │
│  Repository → JPA│
└──┬───┬──────┬────┘
   │   │      │
   ▼   ▼      ▼
┌───┐ ┌────┐ ┌──────┐
│PG │ │ES  │ │Kafka │
│16 │ │8   │ │(RPN) │
└───┘ └────┘ └──────┘
```

## Directory Structure

```
src/main/java/com/telecom/billing/
├── controller/     — HTTP handlers (AdminController, BillingController, UsageController, AuthController)
├── service/        — Business logic (BillingService, UsageService, AuditProducer)
├── repository/     — Spring Data JPA + raw JDBC repositories
├── model/          — JPA entities (Customer, Invoice, UsageRecord, Plan, etc.)
├── config/         — Security, Kafka, Elasticsearch configuration
└── BillingApplication.java — Entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Database | H2 (dev), PostgreSQL 16 (Docker) |
| Search | Elasticsearch-compatible HTTP client |
| Events | Redpanda (Kafka API) |
| Build | Maven |
| Containerization | Docker, Docker Compose |

## Data Entities

Customer, Invoice, Payment, UsageRecord, BillingPlan, Adjustment — with JPA relationships and raw JDBC query surfaces.

## Deployment

4 Docker services (Docker Compose): web (Spring Boot :8082→8010), postgres (:5432), redpanda (:9092), elasticsearch (:9200)

## Security Architecture

- 8 standalone vulnerabilities (A01×2 IDOR on admin/pricing and invoice, A03 SQL injection on usage search, A04 unvalidated negative rates, A09×2 missing audit on pricing and invoice reads)
- 2 chained attacks: chain-01 (data_modification: weak billing admin auth → unvalidated custom rate → missing audit), chain-02 (db_exfiltration: usage SQL injection → invoice IDOR → audit bypass)
- 5 decoys (properly authorized customer detail, scoped invoice by owner, audit producer used in payment path)
- See `.vulns` for the complete manifest.
