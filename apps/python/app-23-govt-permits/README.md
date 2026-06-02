# Government Permit Application Portal

## Overview
A Django application representing a government citizen portal where residents can file permit applications, upload supporting documentation, and track application reviews.

## Business Domain
Government & Public Services

## Tech Stack
- Python 3.10
- Django 4.2
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- Citizen registration & login
- File permit applications (e.g., Residential Building Permit, Commercial Zone License)
- Upload supporting documents (e.g. site plans, blueprints)
- Citizen dashboard to track owned permits
- Reviewer dashboard to approve or reject applications

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-23-govt-permits/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | User login and session creation |
| POST   | `/api/auth/logout` | Session | User logout |
| GET    | `/api/permits` | Session | List permit applications (Decoy: scoped citizen lookup) |
| GET    | `/api/permits/<permit_id>` | Session | Get permit details (vulnerable to IDOR) |
| POST   | `/api/permits/<permit_id>/upload` | Session | Upload permit document (vulnerable to unrestricted upload) |
| POST   | `/api/permits/<permit_id>/approve` | Staff/Reviewer | Approve or reject permit (Decoy: proper staff check) |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the Django dev server:
   ```bash
   python manage.py runserver 8093
   ```
3. The application runs on port `8093`. The database is created in-memory and seeded automatically.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-23-govt-permits .
   ```
2. Run the container:
   ```bash
   docker run -p 8093:8093 app-23-govt-permits
   ```