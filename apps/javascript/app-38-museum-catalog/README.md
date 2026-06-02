# Museum Collection Catalog

## Overview
A JavaScript Express application representing an art museum catalog where users can browse exhibits, write in the public visitor guestbook, and delete items from catalog archives.

## Business Domain
Arts & Museum Catalogs

## Tech Stack
- JavaScript (Node.js)
- Express
- SQLite (in-memory)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Browse museum collection list (Decoy: HTML title escaping)
- View individual exhibit details (vulnerable to IDOR in confidential notes)
- Write comments in public guestbook (vulnerable to Stored XSS)
- Delete artifacts from archive catalog (vulnerable to missing deletion logs)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/javascript/app-38-museum-catalog/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer account |
| POST   | `/api/auth/login` | None | Authenticate customer |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/exhibits` | None | List museum collection (Decoy: HTML title escaping) |
| GET    | `/api/exhibits/:id` | Session | Get specific exhibit details (vulnerable to IDOR) |
| GET    | `/api/guestbook` | None | Read guestbook entries (vulnerable to Stored XSS) |
| POST   | `/api/guestbook` | None | Submit a guestbook entry |
| POST   | `/api/exhibits/:id/delete` | Session (Admin) | Delete catalog item (vulnerable to missing logs) |

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. The server runs on port `8038`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-38-museum-catalog .
   ```
2. Run the container:
   ```bash
   docker run -p 8038:8038 app-38-museum-catalog
   ```