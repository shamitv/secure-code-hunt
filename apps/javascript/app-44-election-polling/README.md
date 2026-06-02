# Election Polling System

## Overview
A JavaScript Express application representing a municipal election database where citizens can register, review candidate lists, and cast ballots.

## Business Domain
Government & E-Voting

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Add candidates (Decoy: secure admin logs)
- List candidates and cast ballots (vulnerable to plaintext vote leakage)
- Cast a ballot (vulnerable to race-based double-voting)
- Close election polling (vulnerable to missing close logs)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-44-election-polling/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new voter account |
| POST   | `/api/auth/login` | None | Authenticate voter |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/candidates` | None | List candidates and ballots (vulnerable to plaintext leak) |
| POST   | `/api/vote/cast` | Session | Cast a ballot (vulnerable to race conditions) |
| POST   | `/api/admin/candidates` | Session (Admin) | Register new candidate (Decoy: secure logs) |
| POST   | `/api/admin/polls/close` | Session (Admin) | Close the election (vulnerable to missing logs) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8044`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-44-election-polling .
   ```
2. Run the container:
   ```bash
   docker run -p 8044:8044 app-44-election-polling
   ```