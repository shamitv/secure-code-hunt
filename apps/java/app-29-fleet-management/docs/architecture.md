# Architecture Document — App 29: Vehicle Fleet Management

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot vehicle fleet management system for vehicle tracking, driver management, maintenance scheduling, and external integration. Provides search and lookup capabilities for fleet assets and personnel.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/fleet/mgmt/
├── config/        — Security configuration, authentication
├── controller/    — HTTP request handlers (VehicleController, IntegrationController, MaintenanceController)
├── model/         — JPA entities (Vehicle, Driver, MaintenanceRecord)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic (DriverService)
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
- **Controller**: REST endpoints for vehicle search, driver LDAP lookup, external vehicle data fetch, maintenance records.
- **Service**: Business logic for LDAP driver lookup (`DriverService.lookupDriverByLicense`) with string-concatenated filters.
- **Repository**: Spring Data JPA interfaces with parameterized queries.
- **Model**: JPA entities for Vehicle, Driver, MaintenanceRecord, User.

## Data Layer
Key entities: Vehicle (id, make, model, year, status), Driver (id, name, licenseNumber), MaintenanceRecord (id, vehicle, date, description). Stored in H2 in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A03 (LDAP injection on driver lookup — `DriverService.lookupDriverByLicense`), A06 (Log4j 2.14.1 — CVE-2021-44228), A10 (SSRF on external vehicle data fetch — `IntegrationController.fetchExternalVehicleData`).

**Chained Attacks**:
- chain-01: Log4Shell → SSRF → Lateral Movement (lateral_movement)
- chain-02: Subtle SSRF Pivot to Injection (lateral_movement)

**Decoys**: `@PreAuthorize` on maintenance records, parameterized JPA queries in VehicleRepository.
