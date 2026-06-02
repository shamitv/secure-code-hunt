# Phase 03 Status Report — app-36 Parking Management System

## Summary
- **Phase**: Kafka + Elasticsearch Wiring + SSRF + Chain Remodel
- **Files created**: 6 (`src/config/kafka.js`, `src/config/elastic.js`, `src/producers/BookingProducer.js`, `src/consumers/BookingConsumer.js`, `src/services/SpotPhotoService.js`, `src/services/GeocodingService.js`)
- **Files modified**: 10 (`package.json`, `src/search/ParkingSearchClient.js`, `src/services/BookingService.js`, `src/controllers/BookingController.js`, `src/controllers/SpotController.js`, `src/routes/spotRoutes.js`, `src/routes/bookingRoutes.js`, `src/app.js`, `tests/contract.test.js`, `.vulns`, `README.md`, `scenarios.md`)
- **New vulnerabilities**: 1 (VULN-06 A10 SSRF)
- **New decoys**: 1 (D6 — GeocodingService hostname allowlist)
- **Chains advanced**: chain-01 remodeled across async boundary (ParkingSearchClient → BookingProducer → BookingConsumer); chain-02 step 2 planted (SSRF), chain fully wired

## Verification
- Existing vulnerabilities intact: PASS
- New vulnerabilities exploitable: PASS (VULN-06 via `POST /api/spots/:id/photo`)
- Decoys present: PASS
- `.vulns` updated: PASS (chain-01 locations updated, chain-02 completed, VULN-06 added)
- README updated: PASS
- scenarios.md updated: PASS
- Contract tests passing: PASS

## Changes Made

### Files Created
- `src/config/kafka.js`
- `src/config/elastic.js`
- `src/producers/BookingProducer.js`
- `src/consumers/BookingConsumer.js`
- `src/services/SpotPhotoService.js`
- `src/services/GeocodingService.js`

### Vulnerabilities Planted
- VULN-06 (A10): `src/services/SpotPhotoService.js` → `importPhoto()` — SSRF with no hostname validation

### Chains Remodeled
- chain-01 step 2 moved from `BookingService.book()` → `BookingProducer.publishBooking()` (crosses HTTP → Kafka boundary)
- chain-01 step 3 moved from `BookingService.cancel()` → `BookingConsumer.processBooking()` (crosses Kafka → PostgreSQL boundary)

### Blockers
- None
