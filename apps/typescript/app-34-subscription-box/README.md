# Subscription Box Service

## Overview
A TypeScript Express application representing a subscription box ordering portal where users can browse subscription packages, manage their subscription states, and update profile settings.

## Business Domain
E-commerce & Subscription Services

## Tech Stack
- TypeScript
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login (vulnerable to unsalted MD5 password checking)
- Search subscription box catalog (vulnerable to SQLi)
- Parameterized package details lookup (Decoy: secure parameters)
- Update profile details (Decoy: secure logs audit)
- Cancel/Update subscriptions (vulnerable to missing security logs)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/typescript/app-34-subscription-box/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer account |
| POST   | `/api/auth/login` | None | Authenticate user (vulnerable to unsalted MD5 hashing) |
| POST   | `/api/auth/logout` | Session | Terminate active user session |
| POST   | `/api/user/profile` | Session | Edit user profile (Decoy: audit logs printed) |
| GET    | `/api/packages/search` | None | Search subscription boxes (vulnerable to SQLi) |
| GET    | `/api/packages/:id` | None | Get specific package details (Decoy: parameterized SQL) |
| POST   | `/api/subscriptions/update` | Session | Modify subscription status (vulnerable to missing audit logs) |

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
4. The server runs on port `8034`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-34-subscription-box .
   ```
2. Run the container:
   ```bash
   docker run -p 8034:8034 app-34-subscription-box
   ```