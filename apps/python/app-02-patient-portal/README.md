# App 02 — Healthcare Patient Portal

## Overview

A full-stack clinical records and appointment scheduler platform built with **Django** (Python) and a decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under static asset routes. The system manages patient credentials, blood classifications, clinical consultation lists, and prescription details.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**Healthcare / MedTech** — Used by patients to check clinical diagnostic histories, active medication prescriptions, and book hospital appointments.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.x, Django 5.x |
| Frontend | Decoupled client-side Single Page Application (HTML5, JavaScript, CSS) |
| Database | SQLite3 |
| Containerisation | Docker |

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Digital Health Records
- View blood types, date of birth, and registration keys
- Monitor active drug prescriptions and dosage instructions

### Appointment Scheduler
- Book new clinic appointments (cardiologist, general medicine, neurologist)
- Trace historical consultation logs

### Security Benchmarking

This application has been developed to contain hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves the client-side SPA portal |
| POST | `/api/auth/login` | — | Authenticates and establishes session |
| POST | `/api/auth/logout` | — | Terminates active portal session |
| GET | `/api/auth/me` | ANY | Retrieves authenticated user profile |
| GET | `/api/patients/search` | ANY | Search patients by name, returns patient IDs (chain link) |
| GET | `/api/patients/{id}/records` | ANY | Browse medical history and prescriptions |
| GET | `/api/appointments` | ANY | Lists scheduled medical consults |
| POST | `/api/appointments` | ANY | Schedule a new clinical consultation |

---

## Running Locally

```bash
cd apps/python/app-02-patient-portal
pip install -r requirements.txt
python manage.py runserver 8082
# Frontend served at http://localhost:8082
```

## Running via Docker

```bash
docker build -t app-02-patient-portal .
docker run -p 8082:8082 app-02-patient-portal
```