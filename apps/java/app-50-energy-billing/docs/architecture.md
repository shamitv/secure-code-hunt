# Architecture Document — App 50: Energy Utility Billing

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot energy utility billing system for customer accounts, meter readings, invoice management, and smart meter integration. Provides REST APIs for billing operations, meter data search, and external smart meter data fetching.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/energy/billing/
├── config/        — Security configuration, H2 console, authentication
├── controller/    — HTTP request handlers (BillingController, MeterController, IntegrationController, TariffController, CustomerController)
├── model/         — JPA entities (Invoice, MeterReading, Customer, Tariff)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic layer
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
- **Controller**: REST endpoints for invoice retrieval, meter reading search, smart meter data fetch, tariff listing, customer details.
- **Service**: Business logic for invoice processing, meter reading queries, and external data integration.
- **Repository**: Spring Data JPA interfaces, including native queries (vulnerable to SQLi).
- **Model**: JPA entities for Invoice, MeterReading, Customer, Tariff, User.

## Data Layer
Key entities: Invoice (id, customer, amount, dueDate), MeterReading (id, customer, reading, date), Customer (id, name, address), Tariff. Stored in H2 in-memory database with unauthenticated H2 web console enabled.

## Security Architecture
**Standalone Vulnerabilities**: A01 (IDOR on invoice retrieval — `BillingController.getInvoice`), A03 (SQL injection on meter reading search — `MeterController.searchReadings`), A05 (H2 console enabled without auth — `SecurityConfig.filterChain`), A10 (SSRF on smart meter fetch — `IntegrationController.fetchSmartMeterData`).

**Chained Attacks**:
- chain-01: SSRF → H2 Console Access → Database Exfiltration (db_exfiltration)
- chain-02: Subtle SSRF Pivot to IDOR → SQLi (db_exfiltration)

**Decoys**: `@PreAuthorize` on tariff endpoints, scoped customer detail retrieval.
