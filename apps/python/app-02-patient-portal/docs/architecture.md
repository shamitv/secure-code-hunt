# Architecture Document — App 02: Healthcare Patient Portal

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Django-based clinical records and appointment scheduler platform for managing patient credentials, blood classifications, clinical consultation lists, and prescription details. It serves as a patient-facing portal for viewing medical histories and booking appointments.

## Architecture Diagram
```
Browser/Client → Django App → SQLite3
```

## Directory Structure
```
patient_portal/     — Django project settings, URLs, WSGI config
portal/             — Django app
├── models.py       — Data models (Patient, Appointment, etc.)
├── views.py        — Request handlers (login, patient records, appointments)
├── urls.py         — URL routing
└── admin.py        — Admin config
reference_guards.py — Reference guard implementations for benchmarks
manage.py           — Django CLI entry point
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Python 3.x, Django 5.x |
| Frontend | HTML5 + JavaScript + CSS SPA |
| Database | SQLite3 |
| Build | pip + requirements.txt |
| Containerization | Docker |

## Layer Architecture
- **Models**: Django ORM models for Patient, Appointment, and related entities.
- **Views**: Function-based views handling authentication, patient search, records retrieval, and appointment booking.
- **URLs**: Django URL patterns mapping routes to view functions.
- **Settings**: Django project configuration including session, security, and database settings.

## Data Layer
Key entities: Patient (username, password_hash, blood_type), Appointment (patient, date, notes), MedicalRecord (patient, diagnosis, prescription). Stored in SQLite3 via Django ORM.

## Security Architecture
**Standalone Vulnerabilities**: A01 (IDOR on patient records — `get_patient_records`), A02 (Weak MD5 password hashing — `set_password_md5`), A07 (No rate limiting on login — `login_view`).

**Chained Attacks**:
- chain-01: User Enumeration → Offline MD5 Crack → Medical Records Exfiltration (db_exfiltration)
- chain-02: Subtle Auth Session Pivot to IDOR (db_exfiltration)

**Decoys**: HTTPOnly session cookies, CSRF-protected appointment booking.
