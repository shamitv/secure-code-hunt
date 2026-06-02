# Wedding Planning Platform

## Overview
A JavaScript Express application representing a wedding planning database where clients can manage guest lists, RSVPs, and registry settings.

## Business Domain
Events & Wedding Planning

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login (vulnerable to unsalted MD5 password hashing)
- Event planning trackers (Decoy: owner user scoping)
- Event details search (Decoy: parameterized SQL)
- Manage event guest RSVPs (vulnerable to IDOR)
- Session cookies (vulnerable to predictable session keys)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-39-wedding-planner/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new candidate account |
| POST   | `/api/auth/login` | None | Authenticate candidate (vulnerable to predictable session ID) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/events` | Session | List logged-in user's events (Decoy: secure scoping) |
| GET    | `/api/events/:id` | Session | Get specific event details (Decoy: parameterized SQL) |
| GET    | `/api/events/:id/guests` | Session | Get guest list for event (vulnerable to IDOR) |
| POST   | `/api/events/:id/guests` | Session | Add guest to list |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8039`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-39-wedding-planner .
   ```
2. Run the container:
   ```bash
   docker run -p 8039:8039 app-39-wedding-planner
   ```