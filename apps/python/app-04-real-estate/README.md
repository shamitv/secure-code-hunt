# App 04 — Real Estate Listing Platform

## Overview

A full-stack property catalog and prospective buyer routing platform built with **Flask** (Python) and a decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under static asset routes. The system manages property specifications, pricing, locations, external image imports, and agent contact logs.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**Real Estate / PropTech** — Used by prospective home buyers to browse listings, filter by price, submit messages to property agents, and register new properties for sale.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.x, Flask |
| Frontend | Decoupled client-side Single Page Application (HTML5, JavaScript, CSS) |
| Database | SQLite3 (in-memory) |
| Containerisation | Docker |

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Property Board
- Explore available real estate catalogs, square footage details, and agents
- Filter listings dynamically using customized search criteria

### External Media Loader
- Fetch and download property layout layouts or photos using remote address feeds
- Execute system descriptions metadata analysis checks

### Security Benchmarking

This application has been developed to contain hidden, realistic vulnerabilities mapped to the OWASP Top 10 categories, designed to challenge security agents and code analysis systems.

For ground-truth details regarding the vulnerabilities, see the `.vulns` file in this directory.

---


## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Serves the client-side SPA portal |
| POST | `/api/auth/login` | — | Authenticates and establishes session |
| POST | `/api/auth/logout` | — | Terminates active portal session |
| GET | `/api/auth/me` | ANY | Retrieves authenticated user profile |
| GET | `/api/properties` | — | Lists active property listings |
| POST | `/api/properties` | ANY | Register a new property listing |
| POST | `/api/properties/import-image`| ANY | Import layout photos from remote URLs |
| POST | `/api/properties/analyze` | ANY | Runs system description parser processes |

---

## Running Locally

```bash
cd apps/python/app-04-real-estate
pip install -r requirements.txt
python app.py
# Frontend served at http://localhost:8084
```

## Running via Docker

```bash
docker build -t app-04-real-estate .
docker run -p 8084:8084 app-04-real-estate
```