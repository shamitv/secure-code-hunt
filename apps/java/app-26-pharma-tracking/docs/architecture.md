# Architecture Document — App 26: Pharmaceutical Drug Tracking

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot pharmaceutical drug tracking system for batch management, custody chain tracking, and inspection logging. Tracks drug shipments across organizations with digital custody signatures.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/pharma/tracking/
├── config/        — Security configuration, auth setup
├── controller/    — HTTP request handlers (BatchController, InspectionController)
├── model/         — JPA entities (Batch, CustodyRecord, Inspection)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic (CustodyService, BatchImportService)
└── support/       — Reference guard implementations
src/main/resources/
├── application.properties
└── data.sql       — Seed data
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | HTML + JS + CSS |
| Database | H2 in-memory |
| Build | Maven |
| Containerization | Docker |

## Layer Architecture
- **Controller**: REST endpoints for batch lookup, batch import, custody transfer, and inspection retrieval.
- **Service**: Business logic for custody signature generation (`CustodyService.generateCustodySignature`), batch import with deserialization (`BatchImportService.importBatch`).
- **Repository**: Spring Data JPA interfaces for batch, custody, and inspection data access.
- **Model**: JPA entities for Batch, CustodyRecord, Inspection, User.

## Data Layer
Key entities: Batch (id, drugName, quantity, organization), CustodyRecord (id, batch, fromOrg, toOrg, signature), Inspection (id, batch, inspector, result). Stored in H2 in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A01 (IDOR on batch details — `BatchController.getBatchDetails`), A02 (Weak MD5 custody signatures — `CustodyService.generateCustodySignature`), A08 (Insecure deserialization — `BatchImportService.importBatch`).

**Chained Attacks**:
- chain-01: IDOR Batch Enumeration → Forged Custody Signature → Supply Chain Tampering (data_modification)
- chain-02: Subtle Deserialization Pivot to IDOR (data_modification)

**Decoys**: BCrypt password hashing, INSPECTOR role-gated inspection creation.
