# App 09 — Legal Document Management System

## Overview

A full-stack legal files and document versioning platform built with **Spring Boot** (backend) and a decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under `static/`. The system manages legal cases, lawsuits progress, NDAs, corporate briefs, and client access portals.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**Legal / Professional Services** — Used by lawyers, legal counsel, and corporate clients to manage sensitive case document versions and review filings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security, Apache Log4j 2 |
| Frontend | Decoupled client-side Single Page Application (HTML5, JavaScript, CSS) |
| Database | H2 (embedded, in-memory) |
| Build | Maven |
| Containerisation | Docker |

---

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Case Management
- View active court cases, filing numbers, statuses
- Create new cases (attorneys only)

### Document Vault
- Browse files under selected cases
- Download/view legal briefs, depositions, contracts
- Upload new legal briefs (attorneys or clients)

### Security Benchmarking

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
| GET | `/api/cases` | ANY | List legal cases (Attorney sees all, client sees mapped) |
| POST | `/api/cases` | ATTORNEY+ | Create a new case file |
| GET | `/api/cases/{id}/documents` | ANY | Browse documents under a legal case |
| GET | `/api/documents/{id}` | ANY | View / download raw legal document content |
| POST | `/api/documents` | ANY | Upload new legal document under case |

---

## Running Locally

```bash
cd apps/java/app-09-legal-documents
./mvnw spring-boot:run
# Frontend served at http://localhost:8083
```

## Running via Docker

```bash
docker build -t app-09-legal-documents .
docker run -p 8083:8083 app-09-legal-documents
```