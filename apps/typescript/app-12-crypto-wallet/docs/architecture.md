# Architecture Document — App 12: Crypto Wallet Service

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A NestJS/TypeScript crypto wallet service for managing digital wallets, balances, and asset transfers. Provides REST API endpoints for authentication, wallet management, and fund transfers.

## Architecture Diagram
```
Browser/Client → NestJS App → In-Memory Object Store
```

## Directory Structure
```
src/
├── main.ts              — Application entry point
├── app.module.ts        — Root NestJS module
├── auth/                — Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── auth.guard.ts    — JWT authentication guard
├── wallet/              — Wallet module
│   ├── wallet.controller.ts
│   ├── wallet.service.ts
│   ├── wallet.module.ts
│   └── wallet.model.ts
├── db.ts                — In-memory data store
└── referenceGuards.ts   — Reference guard implementations
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js, NestJS, TypeScript |
| Frontend | HTML5 + JavaScript + CSS SPA |
| Database | In-Memory Object Store |
| Build | npm / yarn |
| Containerization | Docker |

## Layer Architecture
- **Controllers**: Handle HTTP requests for authentication (login/logout/me), wallet (get/transfer/transactions).
- **Services**: Business logic for wallet creation, fund transfers, transaction history, and authentication.
- **Modules**: NestJS modules organizing auth and wallet functionality with dependency injection.
- **Guard**: JWT authentication guard protecting wallet endpoints.

## Data Layer
Key entities: User (id, username, password), Wallet (id, userId, address, privateKey, balance), Transaction (id, from, to, amount, timestamp). Stored in a JavaScript Map-based in-memory store (`db.ts`).

## Security Architecture
**Standalone Vulnerabilities**: A02 (Plaintext private key storage — `WalletService.createWallet`), A04 (Insecure transfer design — `WalletController.transferFunds`), A07 (No MFA on transfers — `WalletService.executeTransfer`).

**Chained Attacks**:
- chain-01: Wallet IDOR → Private Key Exposure → Unauthorized Asset Transfer (data_modification)
- chain-02: Subtle Auth Session Pivot to Crypto (data_modification)

**Decoys**: Standard JWT authentication guard protecting endpoints.
