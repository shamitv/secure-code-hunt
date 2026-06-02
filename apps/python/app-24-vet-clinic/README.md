# Veterinary Clinic Management

## Overview
A FastAPI application representing a veterinary clinic management system, allowing pet owners to schedule appointments, and veterinarians/staff to manage pet health records and issue prescriptions.

## Business Domain
Healthcare & Veterinary Services

## Tech Stack
- Python 3.10
- FastAPI
- PyJWT
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User login / JWT token authentication
- Search pet records
- Manage pet health profiles (species, age, weight) with strict field validation
- View and update prescriptions (e.g. drug name, dosages)
- Schedule clinic appointments with audit logging
- View appointment lists

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-24-vet-clinic/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Exchange credentials for a JWT token |
| GET    | `/api/pets/search` | JWT (Vet/Admin) | Search pet records (vulnerable to SQLi) |
| POST   | `/api/pets` | JWT (Vet/Admin) | Add a new pet record (Decoy: input validation) |
| POST   | `/api/prescriptions/<prescription_id>/update` | JWT (Vet/Admin) | Update dosage/drug details (vulnerable to logging failure) |
| POST   | `/api/appointments` | JWT | Schedule a new clinic appointment (Decoy: audit logged) |
| GET    | `/api/appointments` | JWT | List appointments |
| GET    | `/api/audit/logs` | JWT (Admin) | Retrieve system audit logs |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8094`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-24-vet-clinic .
   ```
2. Run the container:
   ```bash
   docker run -p 8094:8094 app-24-vet-clinic
   ```