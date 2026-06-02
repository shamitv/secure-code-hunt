# App 06 — Enterprise HR Management System

## Overview

A Spring Boot human resources management application for employee directories, payroll records, leave requests, organization data, and employee onboarding workflow.

## Business Domain

**Human Resources** — Used by HR administrators, managers, and employees within a mid-size enterprise.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | Thymeleaf templates, vanilla JavaScript, HTML/CSS |
| Database | H2 for local development, PostgreSQL 16 in Docker Compose |
| Search / Events | Elasticsearch 8 employee search, Redpanda (Kafka API) payroll audit events |
| Workflow | Custom Java enum + service for onboarding state machine |
| Build | Maven |
| Containerisation | Docker, Docker Compose |

---

## Features

- Browse / search all employees by name, department, or role
- View detailed employee profiles (contact, role, department, hire date)
- Admin: create, update, and deactivate employee records
- View salary details for individual employees
- Generate monthly payroll report (CSV export)
- Salary adjustment with approval workflow
- Submit leave requests (vacation, sick, personal)
- Manager approval / rejection workflow
- Calendar view of team availability
- Visual org chart rendered in the browser
- Drill-down by department
- Manager ↔ report relationships
- Employee onboarding pipeline with state machine (Draft → Verified → Background Check → Active)
- Login / logout with session management
- Roles: `EMPLOYEE`, `MANAGER`, `HR_ADMIN`
- Role-based page access

---

## Security Benchmarking

This application has been developed to contain hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Chained Vulnerability Scenarios

### Chain: "Payroll IDOR → Weak SSN Encryption → DB Exfiltration"

A low-privilege employee can request another employee's payroll record, recover the encrypted SSN field, and decrypt it because the model uses a hardcoded XOR key.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Payroll profile lookup has no role or ownership check and includes encrypted SSNs | Medium | A01 | `src/main/java/com/hr/controller/PayrollController.java` → `getPayroll()` |
| 2 | SSN encryption uses a reversible XOR cipher with a hardcoded key | Medium | A02 | `src/main/java/com/hr/model/Employee.java` → `getRawSsn()` |

**Attack narrative**: The attacker authenticates as any employee, iterates `GET /api/payroll/{employeeId}` to collect other employees' salary data and `ssnEncrypted` values, then uses the XOR key embedded in `Employee.java` to recover raw SSNs.

**Combined Impact**: The attacker can bulk-read workforce salary and SSN records, resulting in high-impact database exfiltration.

---

### Chain: "State Bypass → Missing Audit → Data Modification"

An HR_ADMIN bypasses the Background Check state by directly requesting Active transition, and the unauthorized state change is never recorded in an audit log.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | State machine allows Draft→Active skip without intermediate checks | Low | A04 | `src/main/java/com/hr/service/OnboardingWorkflowService.java` → `transition()` |
| 2 | State transitions persist without writing audit log entries | Low | A09 | `src/main/java/com/hr/service/OnboardingWorkflowService.java` → `transition()` |

**Attack narrative**: An HR_ADMIN creates an onboarding request, then calls the transition endpoint with `targetState=ACTIVE` directly from DRAFT, bypassing the Background Check. Since no audit log is written, there is no forensic record of who performed the unauthorized state change.

**Combined Impact**: An insider can activate an employee without proper vetting, and the absence of audit logging means the unauthorized modification cannot be traced.

---

### Chain: "Password Hash Leak → Weak Session → Account Takeover"

An attacker reads any employee's passwordHash via the unprotected audit endpoint, then exploits the 24-hour session idle timeout to brute-force the login.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Audit endpoint returns passwordHash for any employee ID without authorization | Low | A01 | `src/main/java/com/hr/controller/EmployeeController.java` → `getEmployeeAudit()` |
| 2 | Dashboard session idle timeout is set to 24 hours | Low | A07 | `src/main/java/com/hr/controller/WebController.java` → `dashboard()` |

**Attack narrative**: An authenticated user calls `GET /api/employees/{id}/audit` for any employee ID to obtain their BCrypt passwordHash, cracks it offline, then exploits the 24-hour dashboard session window to brute-force login credentials.

**Combined Impact**: An attacker can take over another user's account by leveraging the leaked credential hash and the excessively long session window.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Login page |
| POST | `/login` | — | Authenticate |
| GET | `/api/health` | — | Container health check |
| GET | `/dashboard` | ANY | Role-based dashboard |
| GET | `/api/employees` | ANY | List / search employees |
| GET | `/api/employees/{id}` | HR_ADMIN or owner | Employee detail (decoy, properly guarded) |
| GET | `/api/employees/{id}/audit` | ANY | Raw employee audit record including credential hash (chain link) |
| POST | `/api/employees` | HR_ADMIN | Create employee |
| PUT | `/api/employees/{id}` | HR_ADMIN | Update employee |
| DELETE | `/api/employees/{id}` | HR_ADMIN | Delete employee |
| POST | `/api/employees/import` | HR_ADMIN | Bulk import (deserialization vuln) |
| GET | `/api/payroll/{employeeId}` | ANY | Salary data (IDOR vuln) |
| GET | `/api/payroll/report` | HR_ADMIN | Monthly payroll CSV |
| GET | `/api/leave/requests` | ANY | Leave requests for current user |
| POST | `/api/leave/requests` | ANY | Submit leave request |
| PUT | `/api/leave/requests/{id}/approve` | MANAGER | Approve leave |
| GET | `/api/org-chart` | ANY | Org chart data |
| POST | `/api/onboarding` | HR_ADMIN | Create onboarding request |
| GET | `/api/onboarding/{id}` | HR_ADMIN | Get onboarding status |
| PUT | `/api/onboarding/{id}/transition` | HR_ADMIN | Advance state (Draft→Verified→Background Check→Active) |
| GET | `/api/onboarding` | HR_ADMIN | List onboarding requests |

---

## Running Locally

```bash
cd apps/java/app-06-hr-management
mvn spring-boot:run
# Frontend served at http://localhost:8080
```

## Running via Docker

```bash
docker compose up --build
# Frontend served at http://localhost:8006
```
