# Event Ticketing Platform

## Overview
A TypeScript Express application representing an online event ticketing platform where users can browse events, search for shows, purchase tickets, and track reservations.

## Business Domain
Entertainment & Ticketing Services

## Tech Stack
- TypeScript
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Search events by keywords (e.g. Rock, Tech)
- Retrieve specific event details (with parameterized query decoy)
- Book event tickets (with validation checking)
- View customer booking histories

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/typescript/app-31-event-ticketing/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and receive session ID cookie (vulnerable to weak PRNG generation) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/events/search` | None | Search events (vulnerable to SQLi) |
| GET    | `/api/events/:id` | None | Get specific event details (Decoy: parameterized SQL) |
| POST   | `/api/tickets/book` | Session | Book tickets (vulnerable to missing rate limits/concurrency checks) |
| GET    | `/api/bookings` | Session | List authenticated user's bookings |

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
4. The server runs on port `8031`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-31-event-ticketing .
   ```
2. Run the container:
   ```bash
   docker run -p 8031:8031 app-31-event-ticketing
   ```