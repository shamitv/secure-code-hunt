# Corporate Travel & Expense

## Overview
A web API for managing corporate travel reservations and employee expense submissions. It allows employees to submit expense reports for travel, meals, and lodging, and enables administrators/accountants to review, approve, or reject these submissions.

## Business Domain
Corporate Operations / Finance & Expense Management.

## Tech Stack
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Database**: SQLite3 (in-memory)
- **Authentication**: Cookie-based sessions

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Logged-in user custom expense listing
- New expense report submission (Travel, Meals, Lodging categories)
- Search through personal expense records by keyword
- Admin dashboard access to view all submitted corporate expenses

## Security Benchmarking
This application is intentionally configured with security flaws for evaluation purposes. The ground-truth list of vulnerabilities can be found in [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-45-travel-expense/.vulns).

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register a new employee account |
| POST | `/api/auth/login` | None | Authenticate credentials and receive a session cookie |
| POST | `/api/auth/logout` | Session | Log out of the active session |
| GET | `/api/expenses` | Session | List authenticated user's own expenses (or all for Admin) |
| POST | `/api/expenses` | Session | Submit a new expense record |
| GET | `/api/expenses/:id` | Session | Retrieve details of a specific expense report (IDOR vulnerable) |
| GET | `/api/expenses/search` | Session | Search through expense records using keyword (SQLi vulnerable) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Running via Docker

1. Build the Docker image:
   ```bash
   docker build -t app-45-travel-expense .
   ```
2. Run the container:
   ```bash
   docker run -p 8045:8045 app-45-travel-expense
   ```