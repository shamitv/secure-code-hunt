# Architecture Document — App 09: Legal Document Management

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot legal document management platform for handling legal cases, documents, NDAs, and corporate briefs. It supports case creation, document upload/download, and user authentication.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/legal/
├── config/        — Security configuration, authentication setup
├── controller/    — HTTP request handlers (CaseController, DocumentController)
├── dto/           — Data Transfer Objects
├── model/         — JPA entities (Case, Document, User)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic layer
└── support/       — Reference guard implementations
src/main/resources/
├── application.properties
└── data.sql       — Seed data initialization
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | Server-side rendered views, HTML + JS + CSS |
| Database | H2 in-memory |
| Build | Maven |
| Containerization | Docker |

## Layer Architecture
- **Controller**: REST endpoints for cases, documents, authentication, and user profile.
- **Service**: Business logic for document management, case handling, and file serving.
- **Repository**: Spring Data JPA interfaces for data access.
- **Model**: JPA entities for Case, Document, User with relationships and constraints.

## Data Layer
Key entities: Case (id, title, status, attorney), Document (id, name, content, case), User (id, username, password, role). Stored in H2 in-memory database. Sensitive documents are stored in plaintext.

## Security Architecture
**Standalone Vulnerabilities**: A01 (IDOR on document download — `DocumentController.downloadDocument`), A02 (Plaintext document storage — `Document.java`), A06 (Log4j 2.14.1 — CVE-2021-44228).

**Chained Attacks**:
- chain-01: Log4Shell Trigger → Path Traversal → Legal Document Exfiltration (lateral_movement)
- chain-02: Subtle State Confusion Pivot to IDOR (lateral_movement)

**Decoys**: Session fixation protection (migrateSession), BCrypt password storage, `@PreAuthorize` on attorney-only endpoints.
