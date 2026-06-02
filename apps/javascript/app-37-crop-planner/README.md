# Agricultural Crop Planner

## Overview
A JavaScript Express application representing a smart agriculture planning platform where farmers can track crops, import farm layout blueprints, and verify weather reports.

## Business Domain
Agriculture & Crop Management

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)
- Multer (in-memory file upload)
- Adm-zip (zip extraction)
- Axios

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Track agricultural crop cycles (Decoy: secure user scoping)
- Individual crop profile views (Decoy: parameterized SQL)
- Import layout blueprints (vulnerable to Zip Slip directory traversal file write)
- Weather forecast lookup proxy (vulnerable to SSRF via custom endpoint URLs)
- Diagnostics configuration console (vulnerable to integration secrets leak)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-37-crop-planner/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer account |
| POST   | `/api/auth/login` | None | Authenticate customer |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/crops` | Session | List logged-in user's crops (Decoy: user scoped) |
| GET    | `/api/crops/:id` | Session | Get crop details (Decoy: parameterized SQL) |
| POST   | `/api/crop-plan/import-layout` | Session | Import ZIP crop layouts (vulnerable to Zip Slip) |
| GET    | `/api/weather/proxy` | Session | Proxy forecast URLs (vulnerable to SSRF) |
| GET    | `/api/system/config` | None | Verify configuration logs (vulnerable to key leak) |
| GET    | `/api/internal/telemetry` | Token | Internal crop database analytics (SSRF Target) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8037`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-37-crop-planner .
   ```
2. Run the container:
   ```bash
   docker run -p 8037:8037 app-37-crop-planner
   ```