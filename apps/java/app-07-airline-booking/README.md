# Airline Booking System

## Overview
A full-stack airline booking application for searching flights, holding seats, creating bookings, and managing check-in workflows.
This application is intentionally vulnerable for security-agent benchmarking.

## Business Domain
Travel / Aviation - passenger booking, seat inventory, online check-in, and airline staff boarding operations.

## Tech Stack
Java 17, Spring Boot 3.x, Spring MVC, Spring Security, Spring Data JPA, Thymeleaf, vanilla JavaScript, H2, Maven, and Docker.

## Features
- Public flight search with passenger-facing filters.
- Passenger registration, login, booking history, seat selection, and cancellation.
- Temporary seat holds before confirmation.
- Online check-in and boarding pass generation.
- Airline staff flight management and boarding summary view.

## Security Benchmarking
Vulnerabilities are intentionally planted for OWASP Top 10: 2021 benchmarking. Ground-truth details are maintained in [`.vulns`](.vulns).

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Chained Vulnerability Scenario

### Chain: "Sequential PNR Enumeration -> Booking IDOR -> Stored XSS on Staff View -> Account Takeover"

An authenticated passenger combines predictable booking references, a boarding-summary IDOR, and staff-side unsafe rendering to execute stored XSS in an airline staff session.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | PNRs are generated as an incrementing sequence (`BK000001`, `BK000002`, ...) | Low | A04 | `PnrGenerator.java` -> `generate()` |
| 2 | Boarding summary returns booking details for any valid PNR without ownership validation | Medium | A01 | `BookingController.java` -> `getBoardingSummary()` |
| 3 | Passenger name is returned as raw HTML and rendered with `innerHTML` on the staff boarding page | Medium | A03 | `BookingController.java` -> `getBoardingSummary()` and `staff-boarding.html` |

**Attack narrative**: The attacker registers with a passenger name containing a script payload, creates a booking, and enumerates predictable PNRs through `/api/bookings/{pnr}/boarding-summary`. When staff open `/staff/boarding` and load the malicious booking summary, the UI renders `passengerDisplay` with `innerHTML`, executing the stored script in the staff browser.

**Combined Impact**: Staff account takeover through stored XSS in a trusted boarding workflow.

### Chain: "Predictable Seat Hold References -> Hold Ownership Bypass -> Unauthorized Hold Confirmation -> Data Modification"

An authenticated passenger guesses another passenger's hold reference, modifies the held seat, and confirms the hold as their own booking without payment verification.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Seat hold references are generated as predictable values such as `HOLD000101` | Low | A04 | `HoldRefGenerator.java` -> `generate()` |
| 2 | Hold lookup and seat-change endpoints trust `holdRef` without checking ownership | Medium | A01 | `SeatHoldService.java` -> `getHoldByRef()` / `changeHeldSeat()` |
| 3 | Hold confirmation trusts `holdRef` and skips owner and payment-state verification | Medium | A04 | `SeatHoldService.java` -> `confirmHold()` |

**Attack narrative**: The attacker creates or guesses nearby hold references, reads a victim's hold through `/api/holds/{holdRef}`, changes the held seat through `/api/holds/{holdRef}/seat`, and confirms it through `/api/holds/{holdRef}/confirm`. The confirmation creates a booking for the attacker using another passenger's held inventory.

**Combined Impact**: Unauthorized booking and seat-inventory modification.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Home / search page |
| GET | `/register` | Public | Registration page |
| POST | `/register` | Public | Passenger registration |
| POST | `/login` | Public | Login |
| GET | `/dashboard` | Authenticated | Passenger dashboard |
| GET | `/staff/boarding` | AIRLINE_STAFF | Staff boarding summary UI |
| GET | `/api/flights/search` | Public | Flight search |
| GET | `/api/flights/{id}/seats` | Authenticated | Seat map for a flight |
| GET | `/api/flights` | AIRLINE_STAFF | All flights management |
| PUT | `/api/flights/{id}` | AIRLINE_STAFF | Update flight details |
| POST | `/api/bookings` | PASSENGER | Create booking |
| GET | `/api/bookings/{pnr}` | PASSENGER | View booking with ownership check |
| PUT | `/api/bookings/{pnr}/cancel` | PASSENGER | Cancel booking |
| GET | `/api/bookings/history` | PASSENGER | User booking history |
| GET | `/api/bookings/{pnr}/boarding-summary` | PASSENGER | Boarding summary with IDOR and raw passenger HTML |
| POST | `/api/checkin/{pnr}` | PASSENGER | Online check-in |
| GET | `/api/checkin/{pnr}/boardingpass` | PASSENGER | Boarding pass |
| POST | `/api/holds` | PASSENGER | Create a temporary seat hold |
| GET | `/api/holds/{holdRef}` | PASSENGER | Read hold details without ownership validation |
| GET | `/api/holds/owned/{holdRef}` | PASSENGER | Decoy safe hold lookup with ownership validation |
| PUT | `/api/holds/{holdRef}/seat` | PASSENGER | Change a held seat without ownership validation |
| POST | `/api/holds/{holdRef}/confirm` | PASSENGER | Confirm a hold without owner or payment verification |

## Running Locally

```bash
cd apps/java/app-07-airline-booking
./mvnw spring-boot:run
# Frontend served at http://localhost:8081
```

## Running via Docker

```bash
docker build -t app-07-airline-booking .
docker run -p 8081:8081 app-07-airline-booking
```
