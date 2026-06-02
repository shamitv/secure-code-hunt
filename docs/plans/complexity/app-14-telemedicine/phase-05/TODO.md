# Phase 05 TODO — Verification + Metadata Sync + VM Testing

## Pre-requisites
- [ ] Phases 1-4 complete and verified
- [ ] VM 192.168.96.110 accessible

## Metadata Sync
- [ ] Update `.vulns`:
  - Add all new standalone vulnerabilities (VULN-05 through VULN-11)
  - Add chain-02 and chain-03 entries
  - Add all new decoy entries
  - Verify all `location`, `method`, `line_range`, `severity`, `cwe` fields
- [ ] Update `apps/typescript/app-14-telemedicine/README.md`:
  - Add new endpoints to API table
  - Add chain-02 and chain-03 tables under Chained Vulnerability Scenario
  - Update Tech Stack table with MongoDB
- [ ] Update `apps/typescript/app-14-telemedicine/scenarios.md`:
  - Add chain-02 narrative (Schedule Override → Missing Audit)
  - Add chain-03 narrative (Debug Leak → SSRF Pivot)
  - Do NOT remove or replace chain-01 content

## Contract Test Extension
- [ ] Update `tests/contract.test.js`:
  - Assert new source files exist (ScheduleValidator, PrescriptionConsumer, DebugController, ClinicalNoteController, etc.)
  - Assert new annotation strings present:
    - `CHAIN LINK 1 (chain-02)` in ScheduleValidator.ts
    - `CHAIN LINK 2 (chain-02)` in PrescriptionConsumer.ts
    - `CHAIN LINK 1 (chain-03)` in DebugController.ts
    - `CHAIN LINK 2 (chain-03)` in PatientSearchClient.ts
    - `VULNERABILITY A04` in ScheduleValidator.ts
    - `VULNERABILITY A08` in PrescriptionConsumer.ts
    - `VULNERABILITY A03` in PatientSearchClient.ts
    - `VULNERABILITY A10` in PatientSearchClient.ts
    - `VULNERABILITY A05` in DebugController.ts
  - Assert chain-02 has 2 components, chain-03 has 2 components
  - Assert decoy count increased

## VM Deployment & Testing
- [ ] Upload app source to VM (192.168.96.110)
- [ ] Run `docker compose build` on VM
- [ ] Run `docker compose up -d` on VM
- [ ] Wait for all 6 services to report healthy
- [ ] Smoke test all endpoints:
  - [ ] `POST /api/auth/register` → 200
  - [ ] `POST /api/auth/login` → 200, token set
  - [ ] `GET /api/auth/me` → 200, user data
  - [ ] `GET /api/appointments` → 200, list
  - [ ] `GET /api/appointments/1` → 200, includes doctorNotes (IDOR)
  - [ ] `POST /api/appointments` → 200 (with valid data)
  - [ ] `POST /api/appointments` → 200 (with allowOverride=true, bypass)
  - [ ] `GET /api/clinical-notes/<id>` → 200 (IDOR)
  - [ ] `POST /api/clinical-notes` → 200
  - [ ] `GET /api/patients/search?q=test` → 200
  - [ ] `GET /api/internal/status` → 200 (exposes topology)
- [ ] Security smoke tests:
  - [ ] Chain-01: Forge JWT with `jwt.decode`, enumerate appointments
  - [ ] Chain-02: Book overlapping appointment → verify prescription written without audit
  - [ ] Chain-03: Get debug info → use SSRF to hit internal service
- [ ] Tear down: `docker compose down -v && docker system prune -a -f --volumes`

## eval-report.md
- [ ] Create `eval-report.md` under `docs/plans/complexity/app-14-telemedicine/`:
  - **Difficulty Assessment** table: Each vuln and chain rated 1-5 with rationale
  - **Hint Leakage Validation**: Search source files for keywords outside permitted locations
  - **Result**: PASS/FAIL summary

## Final Commit
- [ ] Commit after metadata sync:
  `git add -A && git commit -m "app-14 phase-05: metadata sync, .vulns, README, scenarios.md, contract tests"`
- [ ] Commit after eval-report:
  `git add -A && git commit -m "app-14 phase-05: eval-report, master README status update"`

## Master README Update
- [ ] Update `docs/plans/complexity/README.md`:
  - Change app-14 status from "Pending" to "Implemented"
  - Update phase count to 5
  - Add links to phase plans

## Phase Status Report
- [ ] Create `phase-05/status-report.md`
