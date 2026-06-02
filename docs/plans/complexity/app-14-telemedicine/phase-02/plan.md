# Phase 02: Redis Caching + Session Store + Schedule Validation (A04)

## Goal

Wire up real Redis to replace in-memory `AppointmentCache` and add session token blacklisting on logout. Plant A04 vulnerability in schedule validation. Plant chain-02 step 1.

## Scope

### Included
- Create `src/config/redis.ts` (ioredis client)
- Rewrite `AppointmentCache.ts` to use Redis
- Add session token blacklisting to `AuthController.logout`
- Add token blacklist check to `AuthService.requireUser`
- Create `ScheduleValidator.ts` with A04 vulnerability
- Add `POST /api/appointments` endpoint with schedule validation
- Plant CHAIN LINK 1 (chain-02) and VULNERABILITY A04
- Add decoy: strict validator method in same file

### Excluded
- Kafka wiring (Phase 3)
- Clinical notes / ES (Phase 4)
- Prescription consumer (Phase 3)

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Chain Link 1 (chain-02) | A04 | CWE-602 | `src/services/ScheduleValidator.ts` → `validateSlot()` | Skips overlap check when `allow_override=true` is passed in request body | Medium |
| 2 | Standalone | A04 | CWE-602 | Same location | Same — also a standalone vulnerability that any authenticated user can exploit | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/services/ScheduleValidator.ts` → `validateStrict()` | Same file as vulnerable validator, also validates appointment times | Ignores `allow_override` flag, always rejects overlaps |

## Data Model Changes

None — uses existing `appointments` table. Adds `time_slot` column if not already present.

## API Contracts

### New: `POST /api/appointments`

```json
// Request (authenticated)
{
  "doctorId": 3,
  "date": "2026-07-01",
  "timeSlot": "10:00-10:30",
  "allowOverride": true
}

// Response
{
  "id": 3,
  "patientId": 1,
  "doctorId": 3,
  "date": "2026-07-01",
  "timeSlot": "10:00-10:30",
  "status": "SCHEDULED"
}
```

## Artifact Updates

- `.vulns`: Add VULN-05 (A04) entry
- `README.md`: Add POST /api/appointments endpoint, update chain table
- `scenarios.md`: Add chain-02 section

## Dependencies on Other Phases

- **Depends on**: Phase 1 (PG for appointment booking)
- **Required by**: Phase 3 (appointment creation emits Kafka events)
