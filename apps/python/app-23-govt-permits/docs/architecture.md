# Architecture Document — App 23: Government Permit Application Portal

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Django government citizen portal for filing permit applications, uploading supporting documentation, and tracking application reviews. Citizens can submit permits and staff reviewers can approve or reject them.

## Architecture Diagram
```
Browser/Client → Django App → SQLite (in-memory)
```

## Directory Structure
```
govt_permits/       — Django project settings, URLs, WSGI config
permits/            — Django app
├── models.py       — Data models (Permit, Document, User)
├── views.py        — Request handlers (auth, permits, upload, approve)
├── urls.py         — URL routing
└── admin.py        — Admin config
reference_guards.py — Reference guard implementations for benchmarks
manage.py           — Django CLI entry point
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Python 3.10, Django 4.2 |
| Frontend | HTML + JS + CSS |
| Database | SQLite (in-memory) |
| Build | pip + requirements.txt |
| Containerization | Docker |

## Layer Architecture
- **Models**: Django ORM models for Permit (applicant, type, status), Document (file, permit), User.
- **Views**: Function-based views for authentication, permit listing/detail, document upload, and permit approval.
- **URLs**: Django URL patterns mapping routes to view functions.
- **Settings**: Django project configuration with DEBUG=True, wildcard ALLOWED_HOSTS, hardcoded SECRET_KEY.

## Data Layer
Key entities: Permit (id, applicant, type, status, description), Document (id, file, upload_date, permit), User (id, username, password, role). Stored in SQLite in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A01 (IDOR on permit detail — `permit_detail`), A05 (DEBUG=True, hardcoded SECRET_KEY — `settings.py`), A08 (Unrestricted file upload — `upload_document`).

**Chained Attacks**:
- chain-01: Debug Page Info Leak → Unrestricted Upload → RCE (lateral_movement)
- chain-02: Subtle Path Traversal Pivot to IDOR (lateral_movement)

**Decoys**: CSRF middleware enabled, proper staff-only approve check, scoped permit listing filter.
