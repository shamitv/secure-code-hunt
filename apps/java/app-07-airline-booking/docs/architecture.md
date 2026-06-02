# Architecture Document — App 07: Airline Booking System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A full-stack airline booking application for searching flights, holding seats, creating bookings, and managing check-in workflows. Built with Spring Boot, Thymeleaf, and H2 in-memory database.

## Architecture Diagram

```
Browser (Thymeleaf)
        │
        ▼
┌────────────────────┐
│  Spring Boot App   │  (port 8081)
│  Controller →      │
│  Service →         │
│  Repository → JPA  │
└────────┬───────────┘
         │
         ▼
    ┌────────┐
    │  H2 DB │
    │  (mem) │
    └────────┘
```

## Directory Structure

```
src/main/java/com/airline/
├── controller/     — HTTP handlers (FlightController, BookingController, HoldController, etc.)
├── service/        — Business logic (SeatHoldService, FlightSearchService, etc.)
├── repository/     — Spring Data JPA repositories
├── model/          — JPA entities (Flight, Booking, Passenger, SeatHold, etc.)
├── config/         — Security config, data initialization
└── util/           — PNR generator, hold reference generator (predictable — A04)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.x, Spring MVC, Spring Security |
| Frontend | Thymeleaf, vanilla JavaScript |
| Database | H2 (in-memory) |
| Build | Maven |
| Containerization | Docker |

## Data Entities

Flight, Passenger, Booking, SeatHold, CheckIn — with JPA relationships between passengers, bookings, and flights.

## Layer Architecture

- **Controllers**: Handle HTTP requests with path variables, query params; auth via session/role checks
- **Services**: Business logic for flight search, seat hold lifecycle, check-in processing
- **Repositories**: Spring Data JPA for data access
- **Models**: JPA entities with field-level annotations and relationships

## Deployment

Docker container running on port 8081. Single-service application with embedded H2 database.

## Security Architecture

- 4 standalone vulnerabilities (A01 IDOR on boarding summary and hold lookup, A03 stored XSS via innerHTML, A04 predictable PNR and hold references)
- 2 chained attacks: chain-01 (account_takeover: predictable PNR → IDOR boarding summary → stored XSS on staff view), chain-02 (data_modification: predictable hold refs → hold ownership bypass → unauthorized hold confirmation)
- 1 decoy: safe hold lookup with ownership validation (getHoldOwnedByUser)
- See `.vulns` for the complete manifest.
