# Architecture Document — App 08: Warehouse Management System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot warehouse management application for inventory tracking, order fulfillment, employee directory management via LDAP, and shipping label generation. It uses an in-memory H2 database and an embedded UnboundID LDAP server.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory) + Embedded LDAP
```

## Directory Structure
```
src/main/java/com/warehouse/
├── config/               — Security, application configuration
├── controller/           — HTTP request handlers (REST endpoints)
├── dto/                  — Data Transfer Objects
├── model/                — JPA entities
├── repository/           — Spring Data JPA repositories
├── service/              — Business logic layer
└── support/              — Reference guard implementations
src/main/resources/
├── application.properties — App config, actuator settings
└── data.sql               — Sample data initialization
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | Server-side rendered views (Thymeleaf), HTML + JS + CSS |
| Database | H2 in-memory + Embedded UnboundID LDAP |
| Build | Maven |
| Containerization | Docker |

## Layer Architecture
- **Controller**: REST endpoints for inventory, orders, employees, and shipping. Maps HTTP requests to service methods.
- **Service**: Contains business logic including LDAP employee search (`EmployeeLdapService`), shipping label generation (`ShippingService`), inventory management.
- **Repository**: Spring Data JPA interfaces for database access with parameterized queries.
- **Model**: JPA entities for Item, Order, Employee, Product.

## Data Layer
Key entities: Item (id, name, quantity, price), Order (id, status, items), Employee (id, name, department), Product. Stored in H2 in-memory database and embedded LDAP directory for employee records.

## Security Architecture
**Standalone Vulnerabilities**: A03 (LDAP injection — `EmployeeLdapService.searchEmployees`), A05 (Actuator endpoints exposed — `management.endpoints.web.exposure.include=*`), A10 (SSRF — `ShippingService.generateLabel`).

**Chained Attacks**:
- chain-01: LDAP Injection → Directory Structure Disclosure → Inventory Tampering (data_modification)
- chain-02: Subtle SSRF Pivot to Auth Session (data_modification)

**Decoys**: Parameterized JPA queries, BCrypt password hashing, `@PreAuthorize` on order endpoints, session fixation protection.
