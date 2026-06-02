# Phase 05: Verification + Metadata Sync + VM Testing

## Goal

Complete metadata synchronization, verify all vulnerabilities end-to-end on the VM, create eval-report, and finalize all documentation.

## Scope

### Included
- Sync `.vulns` with all new vulns, chains, decoys
- Update `README.md` with full endpoint inventory, chain tables, architecture stack
- Update `scenarios.md` with chain-02 and chain-03 narratives
- Extend `tests/contract.test.js` for new annotations
- Verify ALL existing + new vulnerabilities exploitable
- Deploy to VM (192.168.96.110) and run smoke tests
- Create `eval-report.md`
- Update `docs/plans/complexity/README.md` status

### Excluded
- Fixing any vulnerability (all intentional)
- Additional features beyond what's planted

## Verification Checklist

### Existing Vulnerabilities
- [ ] Chain-01: Forged JWT → enumerate appointments → doctorNotes exposed
- [ ] VULNERABILITY A02: `jwtSecret` defaults to `healthcare123`
- [ ] VULNERABILITY A07 (cookie): Token cookie missing httpOnly/secure
- [ ] VULNERABILITY A07 (JWT): `jwt.decode()` used instead of `jwt.verify()`
- [ ] VULNERABILITY A01: `getAppointmentDetail` by ID without ownership

### New Vulnerabilities
- [ ] VULNERABILITY A04: `allowOverride=true` bypasses schedule validation
- [ ] VULNERABILITY A08: Prescription consumer writes unsanitized payload to DB
- [ ] VULNERABILITY A09: No audit entry when prescription is created
- [ ] Chain-02: Schedule bypass → missing audit → undetected prescription tampering
- [ ] VULNERABILITY A03: ES DSL injection via raw string concatenation
- [ ] VULNERABILITY A10: SSRF via `search_url` parameter override
- [ ] VULNERABILITY A05: Debug endpoint exposes internal topology
- [ ] Chain-03: Debug topology leak → SSRF pivot to internal services
- [ ] VULNERABILITY A01 (notes): Clinical note access by ID without ownership

### Decoys
- [ ] DECOY-01 (BCrypt) intact — `UserRepository` still hashes passwords
- [ ] DECOY-02 (doctorNotes stripping) intact — `listForUser` removes notes
- [ ] DECOY-03 (referenceGuards) intact — `sameOwner`, `allowedCallback`, `normalizeIdentifier` present
- [ ] DECOY-04 (ScheduleValidator strict) functional
- [ ] DECOY-05 (NotificationConsumer schema validation) functional
- [ ] DECOY-06 (searchPatientsStrict parameterized query) functional
- [ ] DECOY-07 (fetchMetadata hostname allowlist) functional

## Artifact Updates
- `.vulns`: 10 standalone vulns, 3 chains, 7 decoys
- `README.md`: Full endpoint table, 3 chain tables, architecture stack
- `scenarios.md`: chain-01, chain-02, chain-03 narratives
- `docs/plans/complexity/README.md`: app-14 status → Implemented

## Dependencies on Other Phases
- **Depends on**: All previous phases complete
