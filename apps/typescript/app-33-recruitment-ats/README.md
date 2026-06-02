# Recruitment ATS Platform

## Overview
A TypeScript Express application representing a recruitment Application Tracking System (ATS) where candidates can submit portfolios/applications and recruiters can review applicant files.

## Business Domain
HR Tech & Recruitment

## Tech Stack
- TypeScript
- Express
- SQLite (in-memory)
- Multer (in-memory file upload)
- Adm-zip (zip extraction)

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- List candidate's own applications (Decoy: secure ID constraint)
- Recruiter dashboard overview (Decoy: recruiter role checks)
- Generate user developer API key (vulnerable to MD5 predictable key generation)
- View candidate application details by application ID (vulnerable to IDOR)
- Upload applicant portfolio zip files (vulnerable to Zip Slip path traversal)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/typescript/app-33-recruitment-ats/.vulns) for the complete list of vulnerability targets.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and receive session cookie |
| POST   | `/api/auth/logout` | Session | Terminate active user session |
| POST   | `/api/auth/api-key` | Session | Request user API key (vulnerable to predictable MD5 generation) |
| GET    | `/api/applications/:id` | Session/API Key | Retrieve a specific application by ID (vulnerable to IDOR) |
| GET    | `/api/applications/my` | Session/API Key | List caller's own applications (Decoy: proper user ID checks) |
| GET    | `/api/recruiter/dashboard` | Session/API Key | Recruiter dashboard (Decoy: role validation) |
| POST   | `/api/applications/upload-portfolio` | Session/API Key (Recruiter role) | Import zip portfolio (vulnerable to Zip Slip path traversal) |

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
4. The server runs on port `8033`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-33-recruitment-ats .
   ```
2. Run the container:
   ```bash
   docker run -p 8033:8033 app-33-recruitment-ats
   ```