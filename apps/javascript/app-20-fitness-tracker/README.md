# Fitness Tracking API

## Overview
A JavaScript Express application representing a fitness tracking dashboard where runners can register, record activities, modify settings, and view workout details.

## Business Domain
Health & Fitness

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Add activities to log (vulnerable to IDOR in detail view)
- Scoped logs listing (Decoy: owner check)
- Update settings (vulnerable to prototype pollution in custom merger)
- Session cookies (vulnerable to predictable session keys)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-20-fitness-tracker/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new candidate account |
| POST   | `/api/auth/login` | None | Authenticate candidate (vulnerable to predictable session ID) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/activities` | Session | List logged-in user's activities (Decoy: secure scoping) |
| GET    | `/api/activities/:id` | Session | Get specific activity details (vulnerable to IDOR) |
| POST   | `/api/user/settings` | Session | Edit user settings (vulnerable to Prototype Pollution) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8020`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-20-fitness-tracker .
   ```
2. Run the container:
   ```bash
   docker run -p 8020:8020 app-20-fitness-tracker
   ```