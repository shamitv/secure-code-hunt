# App 08 — Warehouse Management System

## Overview

A full-stack warehouse management application built with **Spring Boot** (backend) and a custom decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under `static/`. The system handles inventory tracking, order fulfilment, employee management, and shipping label generation.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**Logistics / Warehousing** — Used by warehouse operators, supervisors, and dispatch staff to manage inventory, process orders, and coordinate shipments.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security, Spring Actuator |
| Frontend | Decoupled client-side Single Page Application (HTML5, JavaScript, CSS) |
| Database | H2 (embedded, in-memory) |
| LDAP | Embedded UnboundID LDAP (for employee directory) |
| Build | Maven |
| Containerisation | Docker |

---

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Inventory Management
- View all warehouse items with quantities, locations (aisle/shelf/bin)
- Add / update / remove inventory items
- Low-stock alerts dashboard
- Barcode lookup (simulated)

### Order Fulfilment
- View incoming orders from external system (seeded data)
- Pick list generation for warehouse workers
- Order status tracking (PENDING ➔ PICKING ➔ PACKED ➔ SHIPPED)
- Partial fulfilment support

### Employee Directory (LDAP)
- Search warehouse employees by name or role
- View employee details, shift assignments
- LDAP-backed directory for employee lookups

### Shipping
- Generate shipping labels (fetch carrier-provided label via URL)
- Track shipments with carrier integration (simulated external URL)
- Shipping cost calculator

### Authentication & Roles
- Login / logout with session management
- Roles: `OPERATOR`, `SUPERVISOR`, `ADMIN`
- Role-based access to management functions

---

## Security Benchmarking

This application has been developed to contain hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves the client-side SPA portal |
| POST | `/login` | — | Authenticates and establishes session |
| GET | `/api/users/me` | ANY | Retrieves authenticated user profile |
| GET | `/api/inventory` | ANY | List all inventory items |
| GET | `/api/inventory/{id}` | ANY | Single item detail |
| POST | `/api/inventory` | SUPERVISOR+ | Add item |
| PUT | `/api/inventory/{id}` | SUPERVISOR+ | Update item |
| DELETE | `/api/inventory/{id}` | ADMIN | Remove item |
| GET | `/api/inventory/low-stock` | ANY | Low-stock alerts |
| GET | `/api/orders` | ANY | List orders |
| GET | `/api/orders/{id}` | ANY | Order detail |
| PUT | `/api/orders/{id}/status` | OPERATOR+ | Update order status |
| GET | `/api/orders/{id}/picklist` | OPERATOR+ | Generate pick list |
| GET | `/api/employees/search` | ANY | Employee search |
| POST | `/api/shipping/label` | OPERATOR+ | Generate label |
| GET | `/actuator/**` | ANY | Spring Boot Actuator endpoints |

---

## Running Locally

```bash
cd apps/java/app-08-warehouse-mgmt
./mvnw spring-boot:run
# Frontend served at http://localhost:8082
```

## Running via Docker

```bash
docker build -t app-08-warehouse-mgmt .
docker run -p 8082:8082 app-08-warehouse-mgmt
```