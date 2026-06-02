# Master Complexity Upgrade Plan

This document serves as the wrapper plan for upgrading selected benchmark applications in the secure-code-hunt repository to modeled enterprise full-stack architectures. It also tracks completed in-place complexity rewrites that do not have a phase-plan directory.

---

## 1. Upgrade Objectives

The goal of this phase is to scale the target applications from simple in-memory/SQLite monoliths to multi-container, modular environments. This upgrade:
1. **Models Real-World Complexity**: Implements polyglot persistence, event-driven task queues, fuzzy search services, and dynamic business rule calculations.
2. **Evaluates Advanced Security Scenarios**: Tests the ability of AI detection agents to trace exploit chains across distributed services (e.g. databases, event consumers, cache backends).
3. **Maintains Benchmark Metadata Compliance**: Preserves the annotation, README, `.vulns`, and decoy requirements defined in the repository `AGENTS.md` contribution spec.

---

## 2. Directory Index of Application Upgrade Plans

Below is the index of the selected applications, their architectural upgrades, and links to their phase-wise plans or completed rewrite artifacts:

| App ID | Application Name | Language / Tech Stack | Core Upgrades | Phase Structure | Phase Count | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **01** | E-Commerce Product Catalog API | Python (Flask) | Postgres, MongoDB, Elasticsearch, Kafka, MVC, Dashboard | [Plan](realistic/0.1/app-01-ecommerce-catalog/expansion-plan.md) - [Phase 1](realistic/0.1/app-01-ecommerce-catalog/phase-01/plan.md) ... [Phase 5](realistic/0.1/app-01-ecommerce-catalog/phase-05/plan.md) | 5 | Implemented |
| **05** | Online Learning Management System | Python (Flask) | Postgres, MongoDB, Kafka, Blueprints, Auto-Grading Rules | [Plan](app-05-learning-mgmt/expansion-plan.md) - [Phase 1](app-05-learning-mgmt/phase-01/plan.md) ... [Phase 5](app-05-learning-mgmt/phase-05/plan.md) | 5 | Implemented |
| **06** | Enterprise HR Management System | Java (Spring Boot) | Postgres, Elasticsearch, Kafka, MVC, Log4j RCE Listener | [Plan](app-06-hr-management/expansion-plan.md) - [Phase 1](app-06-hr-management/phase-01/plan.md) ... [Phase 4](app-06-hr-management/phase-04/plan.md) | 4 | Implemented |
| **07** | Airline Booking System | Java (Spring Boot) | Seat-hold workflow, staff boarding UI, contextual chain coverage, README / `.vulns` compliance | [App README](../../../apps/java/app-07-airline-booking/README.md) - [Manifest](../../../apps/java/app-07-airline-booking/.vulns) | N/A | Implemented (in-place rewrite) |
| **10** | Telecom Billing Platform | Java (Spring Boot) | Postgres, TimescaleDB, Kafka, MVC, Multi-Tier Tariffs | [Plan](app-10-telecom-billing/expansion-plan.md) - [Phase 1](app-10-telecom-billing/phase-01/plan.md) ... [Phase 5](app-10-telecom-billing/phase-05/plan.md) | 5 | Implemented |
| **11** | Social Media Analytics Dashboard | TypeScript (Express) | Postgres, Timeseries, Elasticsearch, Kafka, MVC, WebSockets | [Plan](app-11-social-analytics/expansion-plan.md) - [Phase 1](app-11-social-analytics/phase-01/plan.md) ... [Phase 6](app-11-social-analytics/phase-06/plan.md) | 6 | Implemented |
| **14** | Telemedicine Appointment System | TypeScript (Express) | Postgres, MongoDB, Redis, Kafka, Elasticsearch, MVC, Schedule Validation, Clinical Notes | [Plan](app-14-telemedicine/expansion-plan.md) - [Phase 1](app-14-telemedicine/phase-01/plan.md) ... [Phase 5](app-14-telemedicine/phase-05/plan.md) | 5 | Implemented |
| **17** | IoT Device Dashboard | JavaScript (Express) | Postgres, Redis, Redpanda, Elasticsearch, MVC, WebSockets, Dashboard | [Plan](app-17-iot-dashboard/expansion-plan.md) - [Phase 1](app-17-iot-dashboard/phase-01/plan.md) ... [Phase 4](app-17-iot-dashboard/phase-04/plan.md) | 4 | Planned |
| **36** | Parking Management System | JavaScript (Express) | Postgres, MongoDB, Redis, Kafka, Elasticsearch, JWT, Admin Dashboard | [Plan](app-36-parking-mgmt/expansion-plan.md) - [Phase 1](app-36-parking-mgmt/phase-01/plan.md) ... [Phase 5](app-36-parking-mgmt/phase-05/plan.md) | 5 | Planned |

---

## 3. Global Constraints & Standards

Every upgraded application must adhere to the following standards:

### Benchmark Metadata Compliance
- **Source Annotations Required**: Standalone vulnerabilities must retain source comments in the form `// VULNERABILITY <OWASP_ID>: <brief description>`.
- **Chain Link Annotations Required**: Every chain component must retain a source comment in the form `// CHAIN LINK <N> (chain-<ID>): <description>`.
- **Manifest Source of Truth**: `.vulns` remains the machine-readable ground-truth manifest for standalone vulnerabilities, chained attacks, and decoys.
- **README Chain Section Required**: Each app `README.md` must keep the `Chained Vulnerability Scenario` section required by `AGENTS.md`, including the chain table and attack narrative.
- **Supplemental Scenarios Only**: `scenarios.md` may add extra internal narrative, but it must not replace required README or `.vulns` content.

### Docker Compose Orchestration
- All upgraded applications must be configured as a multi-container suite inside a `docker-compose.yml` file.
- Containers must utilize healthchecks to manage startup dependency sequences (e.g. blocking the application container until database and broker ports accept connections).

### Polyglot & Search Integration
- Relational tables (users, logs, billing) must be stored in PostgreSQL.
- Flexible structures (catalogs, notes) must be stored in MongoDB.
- Timeseries logs (telemetry, call records) must use partitioned tables or InfluxDB.
- Searches must pass through Elasticsearch or OpenSearch queries.

---

## 4. Generic Upgrade Guide (Unplanned Apps)

For the ~41 apps not covered by dedicated complexity plans or completed in-place rewrites (apps 02-04, 08-09, 12-13, 15-16, 18-35, 37-50), use the **[Generic Upgrade Guide](generic-upgrade-guide.md)**.

It provides:
- A **randomized architecture selection** process (roll components from a filtered pool)
- **Templates** for `expansion-plan.md`, `vuln-inventory.md`, per-phase `plan.md`/`TODO.md`/`status-report.md`, and app `README.md`
- **Difficulty rating** (1-5 scale) and **hint leakage validation** (keyword scan) in an `eval-report.md`
- **Language-specific notes** for Python/Flask, Java/Spring Boot, and TypeScript/JavaScript/Express
- **Commit cadence** and **status report** requirements built into every TODO checklist

---

## 5. Phase-Wise Plan Convention

Each app's plan directory follows a standard structure for consistency across planned enterprise upgrades:

```text
app-<NN>-<name>/
|-- README.md              # App-level index linking all phases + key documents
|-- expansion-plan.md      # Master plan: architecture, vulnerability strategy, API inventory
|-- vuln-inventory.md      # No-touch zone: existing vulnerabilities, chains, decoys, OWASP gaps
|-- phase-01/
|   |-- plan.md            # Scope, decisions, vulnerability planting table, decoys
|   `-- TODO.md            # Granular file-level task checklist
|-- phase-02/
|   |-- plan.md
|   `-- TODO.md
|-- phase-03/
|   |-- plan.md
|   `-- TODO.md
`-- ...
```

### Phase Count per App

Phase count is determined by each app's specific scope - not forced to a fixed number:

- **5 phases**: Apps with existing codebases needing infrastructure upgrade + business logic + UI (app-01, app-05)
- **6 phases**: Apps with existing codebases + Docker Compose already in place, needing incremental real-service wiring + new vuln/chain planting (app-11)
- **TBD**: Other apps may need 4-6 phases depending on current code maturity and target complexity

### When Adding a New Phase-Structured Plan

1. Create `expansion-plan.md` and `vuln-inventory.md` at the app directory root
2. Create `phase-NN/` directories, each with `plan.md` + `TODO.md`
3. Delete the old flat `plan.md` and `todo.md`
4. Update this master index table with links to the new phase structure
