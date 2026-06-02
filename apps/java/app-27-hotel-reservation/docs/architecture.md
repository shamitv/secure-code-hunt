# Architecture Document — App 27: Hotel Reservation System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview
A Spring Boot hotel reservation system for room search, booking, guest management, and reservation lifecycle. Manages room inventory and guest reservations with session-based authentication.

## Architecture Diagram
```
Browser/Client → Spring Boot App → H2 (in-memory)
```

## Directory Structure
```
src/main/java/com/hotel/reservation/
├── config/        — Security configuration (session management, auth)
├── controller/    — HTTP request handlers (RoomController, AdminController, GuestController)
├── model/         — JPA entities (Room, Reservation, Guest)
├── repository/    — Spring Data JPA repositories
├── service/       — Business logic layer
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
- **Controller**: REST endpoints for room search, admin debug info, reservation management, guest details.
- **Service**: Business logic for room availability, reservation processing, guest management.
- **Repository**: Spring Data JPA interfaces with parameterized queries (decoy) and string-concatenated JPQL (vulnerable).
- **Model**: JPA entities for Room, Reservation, Guest, User.

## Data Layer
Key entities: Room (id, number, type, price, available), Reservation (id, guest, room, checkIn, checkOut), Guest (id, name, email). Stored in H2 in-memory database.

## Security Architecture
**Standalone Vulnerabilities**: A03 (JPQL injection on room search — `RoomController.searchRooms`), A05 (Unauthenticated admin debug endpoint — `AdminController.getSystemInfo`), A07 (Session fixation disabled — `sessionFixation().none()`).

**Chained Attacks**:
- chain-01: Debug Info Leak → Session Fixation → Account Takeover (account_takeover)
- chain-02: Subtle Auth Session Pivot to Injection (account_takeover)

**Decoys**: Parameterized JPA queries on ReservationRepository, scoped guest detail retrieval.
