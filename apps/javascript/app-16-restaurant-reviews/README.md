# Restaurant Review Platform

## Overview
A JavaScript Express application representing a food critique and restaurant review portal where users can search for dining spots, write critiques, and edit reviews.

## Business Domain
Local Services & Restaurant Reviews

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Restaurant list and search (vulnerable to SQLi)
- Parameterized restaurant profile lookup (Decoy: secure parameters)
- Edit restaurant reviews (vulnerable to IDOR)
- Session cookie verification (vulnerable to predictable session keys)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-16-restaurant-reviews/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new reviewer account |
| POST   | `/api/auth/login` | None | Authenticate reviewer (vulnerable to predictable session ID) |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/restaurants/search` | None | Search restaurants (vulnerable to SQLi) |
| GET    | `/api/restaurants/:id` | None | Get specific restaurant details (Decoy: parameterized SQL) |
| GET    | `/api/reviews` | None | List all reviews |
| POST   | `/api/reviews/:id/edit` | Session | Edit an existing review (vulnerable to IDOR) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8016`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-16-restaurant-reviews .
   ```
2. Run the container:
   ```bash
   docker run -p 8016:8016 app-16-restaurant-reviews
   ```