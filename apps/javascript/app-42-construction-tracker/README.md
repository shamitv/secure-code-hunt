# Construction Project Tracker

## Overview
A JavaScript Express application representing a construction tracking database where managers can upload contracts, apply design templates, and review budget statistics.

## Business Domain
Real Estate & Construction Tracking

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Browse budget logs (Decoy: role validation check)
- View individual project contract details (vulnerable to IDOR)
- Set layout template configurations (vulnerable to eval() insecure deserialization)
- Delete contract documents (vulnerable to missing deletion logs)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-42-construction-tracker/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new manager account |
| POST   | `/api/auth/login` | None | Authenticate manager |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/contracts/:id` | Session | Get specific contract details (vulnerable to IDOR) |
| POST   | `/api/contracts/template` | Session | Apply template layouts (vulnerable to eval()) |
| GET    | `/api/admin/stats` | Session (Admin) | Retrieve budget statistics (Decoy: admin check) |
| POST   | `/api/contracts/:id/delete` | Session | Delete project contract (vulnerable to missing logs) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8042`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-42-construction-tracker .
   ```
2. Run the container:
   ```bash
   docker run -p 8042:8042 app-42-construction-tracker
   ```