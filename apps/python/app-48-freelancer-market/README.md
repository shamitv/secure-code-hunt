# Freelancer Marketplace

## Overview
A FastAPI web application representing a gig economy platform where clients can post jobs, freelancers can submit work proposals and bids, and clients can release funds from escrow.

## Business Domain
Freelancing & Gig Economy Services

## Tech Stack
- Python 3.10
- FastAPI
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User login & session management (roles: CLIENT, FREELANCER, ADMIN)
- Create job postings (budget, description)
- Submit freelancer job proposals with custom bid amounts
- View details of proposals (with input validation decoy)
- Release job escrow payments
- Admin interface to list users (with role checking decoy)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-48-freelancer-market/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and receive session cookie (vulnerable to predictable tokens) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/auth/me` | Session | Get active session details |
| GET    | `/api/proposals/<proposal_id>` | Session | Read proposal details (vulnerable to IDOR) |
| POST   | `/api/proposals` | Session (Freelancer) | Submit job proposal (Decoy: bid validation) |
| POST   | `/api/jobs/<job_id>/release-payment` | Session | Release escrow funds (vulnerable to unauthorized access) |
| GET    | `/api/admin/users` | Session (Admin) | List all registered users (Decoy: admin validation) |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8098`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-48-freelancer-market .
   ```
2. Run the container:
   ```bash
   docker run -p 8098:8098 app-48-freelancer-market
   ```