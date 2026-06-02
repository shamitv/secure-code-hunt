# Architecture Document — App 28: Manufacturing Quality Control

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot manufacturing quality control system for defect tracking, product inspection, and QA workflow management. Supports user registration with roles, defect reporting, and inspection result recording.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/manufacturing/qc/
├── config/        — Security configuration, authentication
├── controller/    — HTTP request handlers (AuthController, DefectController, ProductController)
├── model/         — JPA entities (User, Defect, Inspection, Product)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic (InspectionService)
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
- **Controller**: REST endpoints for registration, profile update, defect listing/resolution, inspection result updates.
- **Service**: Business logic for inspection result updates (`InspectionService.updateInspectionResult`) without audit logging.
- **Repository**: Spring Data JPA interfaces for defect, inspection, product, and user data access.
- **Model**: JPA entities for User (with role field), Defect, Inspection, Product.

## Data Layer
Key entities: User (id, username, password, role), Defect (id, product, description, status, reportedBy), Inspection (id, product, result, inspector), Product. Stored in H2 in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A01 (Mass assignment privilege escalation — `AuthController.updateProfile`), A04 (Defect resolution bypass — `DefectController.resolveDefect`), A09 (Missing audit on inspection changes — `InspectionService.updateInspectionResult`).

**Chained Attacks**:
- chain-01: Privilege Escalation → Silent Defect Closure → Undetected Quality Fraud (data_modification)
- chain-02: Subtle State Confusion Pivot to IDOR (data_modification)

**Decoys**: Properly secured getProducts endpoint (`@PreAuthorize QA_MANAGER`), BCrypt password storage.
