# Digital Asset Management

## Overview
A TypeScript Express application representing a digital asset manager where users can upload files, tag them, share assets, and import files from external links.

## Business Domain
Media, Publishing & Cloud Storage

## Tech Stack
- TypeScript
- Express
- Multer
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User login & session management
- File upload (Multer-based storage)
- Browse and download assets
- Import files from remote URLs
- Update tags on assets (with validation decoy)
- Admin statistics dashboard (with secure token authorization decoy)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/typescript/app-15-digital-assets/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and initialize session |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/assets/:id` | Session | Retrieve asset metadata and download path (vulnerable to IDOR) |
| POST   | `/api/assets/upload` | Session | Upload a file asset (vulnerable to unrestricted file uploads) |
| POST   | `/api/assets/import` | Session | Import file asset from URL (vulnerable to SSRF & file write RCE) |
| POST   | `/api/assets/:id/tags` | Session | Update asset tags (Decoy: regex alphanumeric validation check) |
| GET    | `/api/admin/stats` | Token | Get total asset statistics (Decoy: Bearer token validation) |

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
4. The server runs on port `8015`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-15-digital-assets .
   ```
2. Run the container:
   ```bash
   docker run -p 8015:8015 app-15-digital-assets
   ```