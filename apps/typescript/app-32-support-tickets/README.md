# Customer Support Ticket System

## Overview
A TypeScript Express application representing a customer support ticketing portal where customers can submit support requests, search through tickets, and view status.

## Business Domain
Customer Service & Ticket Management

## Tech Stack
- TypeScript
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Ticket creation (Decoy: parameterized SQL)
- Search tickets by keyword (vulnerable to SQLi)
- Retrieve specific ticket details (vulnerable to IDOR)
- Diagnostic health check endpoint (vulnerable to environment info leak)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/typescript/app-32-support-tickets/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer account |
| POST   | `/api/auth/login` | None | Authenticate user and receive session cookie |
| POST   | `/api/auth/logout` | Session | Terminate active user session |
| GET    | `/api/users/profile` | Session | Get profile details (Decoy: secure ID check) |
| POST   | `/api/tickets` | Session | Create a ticket (Decoy: parameterized query) |
| GET    | `/api/tickets/search` | Session | Search tickets (vulnerable to SQLi) |
| GET    | `/api/tickets/:id` | Session | Retrieve a specific ticket by ID (vulnerable to IDOR and detailed stack trace disclosure) |
| GET    | `/api/system/health` | None | Service status check (vulnerable to diagnostics info exposure) |
| POST   | `/api/admin/export` | Recovery Token | Export all database records (vulnerable to authorization bypass) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the TypeScript files:
   ```bash
   npm run build
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. The server runs on port `8032`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-32-support-tickets .
   ```
2. Run the container:
   ```bash
   docker run -p 8032:8032 app-32-support-tickets
   ```