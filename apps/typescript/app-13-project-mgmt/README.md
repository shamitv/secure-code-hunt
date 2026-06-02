# App 13 — Project Management Tool

## Overview

A full-stack project tracking platform built with **Express / TypeScript** (Backend) and a decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under static asset routes. The system manages team boards, user stories, action items, and organization access controls.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**SaaS / Productivity** — Used by remote teams and enterprises to plan sprints, track deliverables, and manage cross-department collaboration.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Frontend | Decoupled client-side SPA (HTML5, JS, CSS) |
| Database | In-Memory Object Store |
| Containerisation | Docker |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Board Management
- Create and explore team project boards.
- Adjust board visibility and access permissions.

### Task Tracking
- Add rich-text tasks to specific project boards.
- Monitor sprint velocity and backlogs.

### Security Benchmarking

This application contains hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves the client-side SPA portal |
| POST | `/api/auth/login` | — | Authenticates and establishes session |
| POST | `/api/auth/logout` | — | Terminates active portal session |
| GET | `/api/auth/me` | ANY | Retrieves authenticated user profile |
| GET | `/api/boards` | ANY | Retrieves all boards for the user's organization |
| GET | `/api/boards/:id` | ANY | Retrieves specific board and its tasks |
| POST | `/api/boards/:id/tasks`| ANY | Creates a new task |
| PUT | `/api/boards/:id/permissions`| ANY | Updates board permissions |

---

## Running Locally

```bash
cd apps/typescript/app-13-project-mgmt
npm install
npm run build
npm start
# Frontend served at http://localhost:8013
```

## Running via Docker

```bash
docker build -t app-13-project-mgmt .
docker run -p 8013:8013 app-13-project-mgmt
```