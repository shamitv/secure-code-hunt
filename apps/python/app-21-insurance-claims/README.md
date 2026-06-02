# Insurance Claims Processor

## Overview
A web application for processing insurance policies and claims, allowing customers to file claims and adjusters/admins to review and approve payouts.

## Business Domain
Insurance & Financial Services

## Tech Stack
- Python 3.10
- Flask
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User login / session management (roles: CUSTOMER, ADJUSTER, ADMIN)
- View and search claims
- File new claims against active policies
- Adjuster dashboard to approve claims and trigger payouts
- Admin dashboard to view aggregate financial stats and list users

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-21-insurance-claims/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | User authentication |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/auth/me` | Session | Current session details |
| GET    | `/api/policies` | Session | List policies (scoped to customer, or all for adjusters) |
| GET    | `/api/claims/search` | Session | Search claims (vulnerable to SQLi) |
| GET    | `/api/claims/<claim_id>` | Session | Get claim details (vulnerable to IDOR) |
| POST   | `/api/claims` | Session | File a claim |
| POST   | `/api/claims/<claim_id>/approve` | Adjuster/Admin | Approve claim and trigger payout (vulnerable to logging failure) |
| GET    | `/api/admin/stats` | Admin | System financial statistics (Decoy) |
| GET    | `/api/admin/users` | Admin | List all users |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8091`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-21-insurance-claims .
   ```
2. Run the container:
   ```bash
   docker run -p 8091:8091 app-21-insurance-claims
   ```