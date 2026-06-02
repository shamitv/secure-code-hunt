# App 12 — Crypto Wallet Service

## Overview

A full-stack crypto wallet service built with **NestJS / TypeScript** (Backend) and a decoupled client-side Single Page Application (**HTML5 + vanilla JS + CSS SPA**) served under static asset routes. The system manages user wallets, cryptographic keys, balances, and real-time asset transfers.

This application is built for security-agent benchmarking and evaluation purposes.

---

## Business Domain

**FinTech / Crypto** — Used by individuals to manage their digital assets, view balances, and transfer funds to other addresses.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, NestJS, TypeScript |
| Frontend | Decoupled client-side SPA (HTML5, JS, CSS) |
| Database | In-Memory Object Store |
| Containerisation | Docker |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).

### Wallet Management
- Securely create and manage digital wallets.
- View real-time wallet balances and public addresses.

### Asset Transfers
- Instantly send funds to other wallet addresses.
- View comprehensive transaction histories.

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
| GET | `/api/wallet` | ANY | Retrieves user's wallet details |
| POST | `/api/wallet/transfer`| ANY | Initiates a fund transfer |
| GET | `/api/wallet/transactions`| ANY | Lists user's transaction history |

---

## Running Locally

```bash
cd apps/typescript/app-12-crypto-wallet
npm install
npm run build
npm run start:prod
# Frontend served at http://localhost:8012
```

## Running via Docker

```bash
docker build -t app-12-crypto-wallet .
docker run -p 8012:8012 app-12-crypto-wallet
```