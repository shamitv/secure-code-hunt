# Architecture Document — App 06: Enterprise HR Management System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A Spring Boot human resources management application for employee directories, payroll records, leave requests, organization data, and employee onboarding workflow. Used by HR administrators, managers, and employees in a mid-size enterprise.

## Architecture Diagram

```
Browser (Thymeleaf + JS)
        │
        ▼
┌────────────────────┐
│  Spring Boot App   │  (port 8080 / mapped to 8006)
│  Controller →      │
│  Service →         │
│  Repository → JPA  │
└───┬───┬──────┬─────┘
    │   │      │
    ▼   ▼      ▼
┌────┐ ┌────┐ ┌──────┐
│ PG │ │ES  │ │Kafka │
│16  │ │8   │ │(RPN) │
└────┘ └────┘ └──────┘
```

## Directory Structure

```
src/main/java/com/hr/
├── config/              — Security config, BCrypt, session settings
├── controller/          — HTTP request handlers (8 controllers)
├── service/             — Business logic layer
├── repository/          — Spring Data JPA repositories
├── model/               — JPA entities (Employee, Payroll, Leave, etc.)
├── messaging/           — Kafka consumers (PayrollAuditConsumer with Log4j)
├── search/              — Elasticsearch client (vulnerable and safe paths)
└── HrApplication.java   — Spring Boot entry point
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | Thymeleaf templates, vanilla JavaScript |
| Database | H2 (dev), PostgreSQL 16 (Docker) |
| Search | Elasticsearch 8 |
| Events | Redpanda (Kafka API) |
| Build | Maven |
| Containerization | Docker, Docker Compose |

## Layer Architecture

- **Controllers**: HTTP request handling, auth checks via `@PreAuthorize` and session inspection
- **Services**: Business logic, workflow state machines, payroll calculations
- **Repositories**: Spring Data JPA interfaces with parameterized queries
- **Models**: JPA entities with field-level annotations

## Data Layer

| Entity | Table | Key Fields |
|---|---|---|
| Employee | employees | id, name, email, department, role, passwordHash, ssnEncrypted |
| Payroll | payroll | id, employee_id, salary, effective_date |
| Leave Request | leave_requests | id, employee_id, type, start_date, end_date, status |
| Onboarding | onboarding | id, employee_id, state, created_by |
| Org Chart | org_chart | id, employee_id, manager_id, department |

## Message Flow

Payroll operations → Kafka audit event → PayrollAuditConsumer (Log4j logging)

## Deployment

4 Docker services (Docker Compose): web (Spring Boot :8080→8006), postgres (:5432), kafka/redpanda (:9092), elasticsearch (:9200)

## Security Architecture

- 8 standalone vulnerabilities (A01×2 IDOR, A02 weak XOR crypto, A03 ES injection, A04 state bypass, A07 weak session, A08×2 deserialization+Log4j, A09 missing audit)
- 3 chained attacks: chain-01 (db_exfiltration: Payroll IDOR + XOR SSN), chain-02 (data_modification: state bypass + missing audit), chain-03 (account_takeover: audit hash leak + weak session)
- 7 decoys (BCryptPasswordEncoder, parameterized JPA queries, properly authorized payroll report, scoped onboarding listing)
- See `.vulns` for the complete manifest.
