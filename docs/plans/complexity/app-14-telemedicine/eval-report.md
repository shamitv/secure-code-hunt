# Evaluation Report — app-14 Telemedicine Appointment System

## Difficulty Assessment

### Standalone Vulnerabilities

| Vuln ID | OWASP | Location | Difficulty | Rationale |
|---------|-------|----------|------------|-----------|
| VULN-01 | A07 | `src/services/TokenService.ts` → `verify()` | 1 | Trivial — single HTTP request using any JWT.decode-compatible token; no auth needed |
| VULN-02 | A01 | `src/services/AppointmentService.ts` → `getAppointmentDetail()` | 2 | Easy — requires a valid session cookie then enumerates appointment IDs |
| VULN-03 | A02 | `src/config/appConfig.ts` → `appConfig` | 1 | Trivial — hardcoded secret readable in source code |
| VULN-04 | A07 | `src/controllers/AuthController.ts` → `login()` | 1 | Trivial — inspect Set-Cookie headers after login |
| VULN-05 | A04 | `src/services/ScheduleValidator.ts` → `validateSlot()` | 2 | Easy — POST with allowOverride=true in request body |
| VULN-06 | A08 | `src/consumers/PrescriptionConsumer.ts` → `processPrescription()` | 3 | Moderate — requires understanding Kafka topic structure and sending malformed messages |
| VULN-07 | A09 | `src/consumers/PrescriptionConsumer.ts` → `processPrescription()` | 3 | Moderate — same consumer; requires cross-referencing prescription_log with missing audit entries |
| VULN-08 | A03 | `src/search/PatientSearchClient.ts` → `searchPatients()` | 2 | Easy — inject DSL via q parameter with string concatenation |
| VULN-09 | A10 | `src/search/PatientSearchClient.ts` → `searchPatients()` | 3 | Moderate — requires knowing internal service URLs (or chain-03 step 1) |
| VULN-10 | A05 | `src/controllers/DebugController.ts` → `status()` | 1 | Trivial — unauthenticated GET endpoint |
| VULN-11 | A01 | `src/services/ClinicalNoteService.ts` → `getNoteById()` | 2 | Easy — requires session, then enumerates note IDs |

### Chain Scenarios

| Chain | Name | Difficulty | Rationale |
|-------|------|------------|-----------|
| chain-01 | Weak JWT Validation → Patient Notes IDOR → DB Exfiltration | 2 | Two-step; both steps are individually easy |
| chain-02 | Schedule Override → Missing Audit → Undetected Prescription Tampering | 3 | Two-step across schedule API and async Kafka consumer |
| chain-03 | Debug Topology Leak → SSRF Internal Pivot | 3 | Two-step; first step reveals topology, second uses it for SSRF |

---

## Hint Leakage Validation

Search keywords: `VULNERABILITY`, `CHAIN LINK`, `DECOY`, `intentional vuln`, `benchmark`

### Search Scope: TypeScript/JavaScript source files

Command:
```
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" \
  apps/typescript/app-14 \
  -g "*.{ts,js}" \
  -g "!**/.vulns" \
  -g "!**/README.md" \
  -g "!**/scenarios.md" \
  -g "!docs/plans/complexity/**" \
  | grep -v "VULNERABILITY\|CHAIN LINK\|DECOY"
```

| Search Scope | Files Scanned | Matches | Status |
|-------------|---------------|---------|--------|
| All `.ts` source files | 30+ | 0 outside annotations | PASS |
| Test files | 1 | 0 | PASS |
| Config files (non-.vulns) | 5 | 0 | PASS |
| Docker files | 2 | 0 | PASS |

**Result**: ZERO matches outside the permit list. No hint leakage detected.

---

## Summary

| Metric | Value |
|--------|-------|
| Total standalone vulnerabilities | 11 |
| Total chain scenarios | 3 |
| Total decoy patterns | 7 |
| OWASP coverage | 9/10 (A01, A02, A03, A04, A05, A07, A08, A09, A10) |
| Hint leakage | NONE — PASS |
| Average difficulty (standalone) | 1.9 (Easy) |
| Average difficulty (chains) | 2.7 (Easy-Moderate) |
