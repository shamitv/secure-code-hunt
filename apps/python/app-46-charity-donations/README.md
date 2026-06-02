# Charity Donation Platform

## Overview
A Flask web application representing a nonprofit platform where users can browse campaigns, make donations, and staff/administrators can manage donor list records and issue refunds.

## Business Domain
Nonprofit & Fundraising Services

## Tech Stack
- Python 3.10
- Flask
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User authentication and session management
- Browse active campaigns (with parameterized search decoy)
- Donate to campaigns (with CSRF validation decoy)
- Search donation logs and notes
- Issue refunds for specific donation transactions
- Admin view to check system audit logs

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-46-charity-donations/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and obtain CSRF token |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/auth/me` | Session | Get active user details |
| GET    | `/api/donations/search` | Staff/Admin | Search donation records (vulnerable to SQLi) |
| POST   | `/api/donations/<donation_id>/refund` | Staff/Admin | Issue donation refund (vulnerable to logging failure) |
| GET    | `/api/campaigns` | None | List active campaigns (Decoy: parameterized SQL) |
| POST   | `/api/donations` | Session | Submit new donation (Decoy: CSRF validation) |
| GET    | `/api/admin/audit/logs` | Admin | Retrieve administrative event logs |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8096`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-46-charity-donations .
   ```
2. Run the container:
   ```bash
   docker run -p 8096:8096 app-46-charity-donations
   ```