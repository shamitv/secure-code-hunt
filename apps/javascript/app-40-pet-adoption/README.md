# Pet Adoption Portal

## Overview
A JavaScript Express application representing a pet adoption database where clients can browse pets, submit adoption applications, and configure display layouts.

## Business Domain
Animal Welfare & Pet Adoption

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Browse adoption list (Decoy: secure parameters)
- Search available pets (vulnerable to SQLi)
- Apply for pet adoption (Decoy: parameterized SQL)
- Set dashboard pet layout template (vulnerable to eval() insecure deserialization)
- Diagnostics configuration console (vulnerable to integration secrets leak)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-40-pet-adoption/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer account |
| POST   | `/api/auth/login` | None | Authenticate customer |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/pets/search` | None | Search available pets (vulnerable to SQLi) |
| GET    | `/api/pets/:id` | None | Get specific pet details (Decoy: parameterized SQL) |
| POST   | `/api/applications/apply` | Session | Apply for pet adoption (Decoy: parameterized SQL) |
| POST   | `/api/pets/layout` | Session / Token | Configure dashboard templates (vulnerable to eval()) |
| GET    | `/api/system/diagnostics` | None | Verify configuration status (vulnerable to key leak) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8040`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-40-pet-adoption .
   ```
2. Run the container:
   ```bash
   docker run -p 8040:8040 app-40-pet-adoption
   ```