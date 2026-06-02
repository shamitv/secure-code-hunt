# Phase 05: Verification + Evaluation

## Goal

Perform end-to-end verification of every planted vulnerability and chained attack scenario. Write and execute Docker-based integration smoke tests. Generate the `eval-report.md` with difficulty ratings (1–5) for every vulnerability and chain. Run the hint-leakage validation scan across all source files. Produce final phase status report.

## Scope

### Included
- [ ] Write integration smoke tests in `tests/exploit-smoke.test.js`
- [ ] Verify all 7 standalone vulnerabilities are exploitable
- [ ] Verify all 3 chained attack scenarios execute end-to-end
- [ ] Verify all 8 decoy patterns are present and functional
- [ ] Deploy full app to VM (`192.168.96.110`) via `docker compose up --build -d`
- [ ] Run all tests against live containers on VM
- [ ] Tear down Docker containers on VM after verification
- [ ] Generate `eval-report.md` — difficulty ratings for each vuln and chain
- [ ] Run hint-leakage validation scan — confirm zero leaks outside permit list
- [ ] Final `.vulns` audit — cross-check every annotation against manifest
- [ ] Final `README.md` audit — chain section, API endpoint table, tech stack correct
- [ ] Final `scenarios.md` audit — all narratives match implemented attacks

### Excluded
- New vulnerability planting
- New chain scenarios
- Code refactoring or optimization
- Adding test framework (use existing `node` runner pattern)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Smoke tests via `node` script, not jest/mocha | Matches existing `contract.test.js` pattern. Avoids adding new test framework dependency. Tests make real HTTP requests to the app. |
| Deploy to VM for live testing | Per AGENTS.md testing workflow — all Docker-enabled apps must be verified on `192.168.96.110`. |
| Difficulty rating 1–5 per generic guide | Each vuln and chain rated independently on exploit complexity. |
| Hint-leakage scan via ripgrep | Follows exact search commands from generic upgrade guide Section 7.2. Validates zero benchmark keywords outside permit-listed annotations. |

## Verification Checklist

### Standalone Vulnerabilities

| # | OWASP | Test | Expected Result |
|---|-------|------|----------------|
| VULN-01 | A03 | `GET /api/spots/search?q=*:*` | Returns all spots including restricted/premium (ES injection broadens results) |
| VULN-02 | A04 | `POST /api/bookings/book` with `totalCost: 0` | Booking created with zero cost, persisted via Kafka consumer |
| VULN-03 | A09 | `POST /api/bookings/:id/cancel` then check consumer logs | Booking status updated to CANCELLED; no audit event in Kafka/consumer logs |
| VULN-04 | A01 | `GET /api/bookings` as user A, observe user B's bookings | Returns bookings belonging to other users (no ownership filter) |
| VULN-05 | A05 | `GET /api/admin/debug` with no auth | Returns 200 with internal service URLs |
| VULN-06 | A10 | `POST /api/spots/:id/photo` with `imageUrl: "http://redis:6379/PING"` | Request reaches internal Redis (check Redis container logs) |
| VULN-07 | A02 | Extract JWT secret from source, forge admin token, use against admin endpoint | Forged token accepted; admin access granted |

### Chained Attacks

| Chain | Steps | Test | Expected Result |
|-------|-------|------|----------------|
| chain-01 | A03→A04→A09 | ES injection to find premium spot ID → book with zero cost via Kafka → verify cancellation without audit | Zero-cost premium booking persisted; cancellation has no audit trail |
| chain-02 | A05→A10 | Hit debug endpoint → use leaked Redis URL in photo import → verify Redis receives request | Debug returns internal URLs; SSRF reaches Redis; visible in Redis logs |
| chain-03 | A02→A07→A01 | Extract hardcoded secret → forge token for admin → export all booking PII via cross-DB endpoint | Full PII dump returned including user profiles from MongoDB |

### Decoys

| # | Location | Test |
|---|----------|------|
| D1 | `SpotService.createSpot()` | Verify audit event published when creating spot |
| D2 | `SpotController.findById()` | Verify param passed to repository (not concatenated) |
| D3 | `referenceGuards.js` | Verify URL rejected if hostname not in allowlist |
| D4 | `BookingController.cancel()` | Verify cancellation rejected if `userId` doesn't match session |
| D5 | `HealthController.health()` | Verify response is ONLY `{ status: 'ok' }` |
| D6 | `GeocodingService.resolveAddress()` | Verify internal URL rejected; external allowed host accepted |
| D7 | `AuthController.refreshToken()` | Verify iss/aud/exp claims validated |
| D8 | `middleware/adminOnly.js` | Verify non-admin session rejected for admin routes |

## VM Deployment & Testing

### Deploy
```bash
# From local dev environment, paramiko/SSH to VM
scp -r apps/javascript/app-36-parking-mgmt user@192.168.96.110:/tmp/
ssh user@192.168.96.110
cd /tmp/app-36-parking-mgmt
docker compose build
docker compose up -d
# Wait for all 6 containers to report healthy
```

### Smoke Test
```bash
# Run exploit smoke test against deployed containers
node tests/exploit-smoke.test.js
```

### Tear-down
```bash
docker compose down -v
docker system prune -a -f --volumes
```

## Eval Report Contents

### Difficulty Ratings

| Vuln / Chain | OWASP | Difficulty (1-5) | Rationale |
|-------------|-------|------------------|-----------|
| VULN-01 | A03 | 1 | Single GET request; no auth; payload is `?q=*:*` |
| VULN-02 | A04 | 2 | Requires session; set `totalCost: 0` in POST body |
| VULN-03 | A09 | 2 | Requires session; cancel booking; verify no audit log |
| VULN-04 | A01 | 2 | Requires session; GET all bookings; observe cross-user data |
| VULN-05 | A05 | 1 | Single GET request; no auth; reads response |
| VULN-06 | A10 | 3 | Requires admin session + knowledge of internal hostnames (from debug leak); POST to photo endpoint |
| VULN-07 | A02 | 2 | Requires reading source code or stack trace for secret; forge JWT |
| chain-01 | A03→A04→A09 | 3 | Three steps across 3 files; must understand Kafka async boundary |
| chain-02 | A05→A10 | 3 | Two steps across 2 files; must connect debug leak to SSRF target |
| chain-03 | A02→A07→A01 | 4 | Three steps across config/middleware/service; must understand cross-DB join; forge JWT token; craft export request |

### Hint-Leakage Validation

Run the search command from generic guide Section 7.2:

```bash
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" \
  apps/javascript/app-36-parking-mgmt \
  -g "*.{ts,js}" \
  -g "!**/.vulns" \
  -g "!**/README.md" \
  -g "!**/scenarios.md" \
  -g "!docs/plans/complexity/**" \
  | grep -v "VULNERABILITY\|CHAIN LINK\|DECOY"
```

**Expected result**: Zero matches. All hits should be within annotation comments (`// VULNERABILITY`, `// CHAIN LINK`, `// DECOY`) which are on the permit list.

## Artifact Updates

- `.vulns`: Final audit — cross-check every annotation in source against manifest entries
- `README.md`: Final audit — chain tables, endpoint tables, tech stack correct
- `scenarios.md`: Final audit — all attack narratives match implemented exploits
- `tests/exploit-smoke.test.js`: New file — integration smoke tests
- `eval-report.md`: New file — difficulty ratings + hint-leakage validation results

## Dependencies on Other Phases

- **Depends on**: All phases (1-4) must be complete and verified
- **Required by**: None — this is the final phase
