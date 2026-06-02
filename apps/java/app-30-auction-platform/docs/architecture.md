# Architecture Document — App 30: Auction Platform

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot auction platform for listing items, placing bids, and processing payments. Supports user registration, item listing, competitive bidding, and webhook-based payment notifications.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/auction/platform/
├── config/        — Security configuration, authentication
├── controller/    — HTTP request handlers (ListingController, WebhookController)
├── model/         — JPA entities (User, Listing, Bid, Payment)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic (BidService, WalletService)
└── support/       — Reference guard implementations
src/main/resources/
├── application.properties
└── data.sql       — Seed data
```

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | HTML + JS + CSS |
| Database | H2 in-memory |
| Build | Maven |
| Containerization | Docker |

## Layer Architecture
- **Controller**: REST endpoints for registration, login, listing retrieval, bid placement, and payment webhook handling.
- **Service**: Business logic for bid placement (`BidService.placeBid`) with race condition vulnerability, wallet deduction with serializable isolation (decoy).
- **Repository**: Spring Data JPA interfaces for listings, bids, users, and payments.
- **Model**: JPA entities for User (plaintext password), Listing, Bid, Payment.

## Data Layer
Key entities: User (id, username, password — plaintext), Listing (id, seller, title, startingPrice), Bid (id, listing, bidder, amount), Payment (id, listing, payer, status). Stored in H2 in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A04 (Race condition on bidding — `BidService.placeBid`), A07 (Plaintext password storage — `User.java`), A08 (Unsigned webhook acceptance — `WebhookController.handlePaymentWebhook`).

**Chained Attacks**:
- chain-01: Plaintext Password Dump → Forged Webhook → Transaction Fraud (data_modification)
- chain-02: Subtle SSRF Pivot to State Confusion (data_modification)

**Decoys**: Properly secured getListings endpoint, serializable transaction isolation on wallet deduction.
