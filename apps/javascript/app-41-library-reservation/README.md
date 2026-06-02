# Library Book Reservation System

## Overview
A JavaScript Express application representing a library book reservation tracker where members can search books, borrow items, and review account reservation history.

## Business Domain
Education & Libraries

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login (vulnerable to unsalted MD5 password hashing)
- Search book catalog (vulnerable to SQLi)
- Parameterized book details lookup (Decoy: secure parameters)
- Scoped reservation list (Decoy: owner user scoping)
- Retrieve book reservation details by ID (vulnerable to IDOR)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-41-library-reservation/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new candidate account |
| POST   | `/api/auth/login` | None | Authenticate candidate (vulnerable to predictable session ID) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/books/search` | None | Search available books (vulnerable to SQLi) |
| GET    | `/api/books/:id` | None | Get specific book details (Decoy: parameterized SQL) |
| GET    | `/api/reservations` | Session | List logged-in user's borrows (Decoy: secure scoping) |
| GET    | `/api/reservations/:id` | Session | Get details for reservation (vulnerable to IDOR) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8041`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-41-library-reservation .
   ```
2. Run the container:
   ```bash
   docker run -p 8041:8041 app-41-library-reservation
   ```