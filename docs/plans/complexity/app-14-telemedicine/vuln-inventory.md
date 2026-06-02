# Vulnerability Inventory — App 14 (Telemedicine Appointment System)

## Purpose

This document enumerates every intentionally planted vulnerability, chain link, and decoy in the current app-14 codebase. It serves as a **no-touch zone** reference — no implementation step may remove, weaken, or fix any item listed here.

---

## App Profile

| Property | Value |
|----------|-------|
| App ID | `app-14` |
| Language | TypeScript |
| Framework | Express |
| Source file count | 22 (under `src/`) |
| Entry point | `src/index.ts` |
| Manifest | `.vulns` |

---

## Standalone Vulnerabilities

### VULN-01 — Unsigned JWT Acceptance (A07)

| Field | Value |
|-------|-------|
| OWASP | **A07** — Identification & Authentication Failures |
| CWE | CWE-347 |
| File | `src/services/TokenService.ts` |
| Method | `verify` |
| Line range | 12–18 |
| Severity | High |
| Source Comment | `// CHAIN LINK 1 (chain-01): JWT payload is decoded without validating the signature.` |
| Source Comment | `// VULNERABILITY A07: Token validation accepts unsigned or forged JWT payloads.` |

### VULN-02 — IDOR on Appointment Detail (A01)

| Field | Value |
|-------|-------|
| OWASP | **A01** — Broken Access Control |
| CWE | CWE-639 |
| File | `src/services/AppointmentService.ts` |
| Method | `getAppointmentDetail` |
| Line range | 25–39 |
| Severity | High |
| Source Comment | `// CHAIN LINK 2 (chain-01): Appointment notes are loaded by ID without owner or doctor checks.` |
| Source Comment | `// VULNERABILITY A01: Patient notes endpoint exposes records through an IDOR.` |

### VULN-03 — Weak Hardcoded JWT Secret (A02)

| Field | Value |
|-------|-------|
| OWASP | **A02** — Cryptographic Failures |
| CWE | CWE-321 |
| File | `src/config/appConfig.ts` |
| Method | `appConfig` |
| Line range | 10–17 |
| Severity | Medium |
| Source Comment | `// VULNERABILITY A02: JWT signing secret is hardcoded and weak.` |

### VULN-04 — Insecure Session Cookie (A07)

| Field | Value |
|-------|-------|
| OWASP | **A07** — Identification & Authentication Failures |
| CWE | CWE-1004 |
| File | `src/controllers/AuthController.ts` |
| Method | `login` |
| Line range | 23–29 |
| Severity | Medium |
| Source Comment | `// VULNERABILITY A07: Session token cookie is readable by browser JavaScript and not marked secure.` |

---

## Chained Vulnerability Scenarios

### chain-01: Weak JWT Validation → Patient Notes IDOR → DB Exfiltration

**Combined Impact**: `db_exfiltration`

| Step | OWASP | CWE | File | Method | Severity | Source Comment |
|------|-------|-----|------|--------|----------|----------------|
| 1 | A07 | CWE-347 | `src/services/TokenService.ts` | `verify` | Medium | `// CHAIN LINK 1 (chain-01): JWT payload is decoded without validating the signature.` |
| 2 | A01 | CWE-639 | `src/services/AppointmentService.ts` | `getAppointmentDetail` | Medium | `// CHAIN LINK 2 (chain-01): Appointment notes are loaded by ID without owner or doctor checks.` |

---

## Decoy Patterns

### DECOY-01 — BCrypt Password Hashing

| Field | Value |
|-------|-------|
| File | `src/repositories/UserRepository.ts` |
| Pattern | `bcrypt.hashSync(password, salt)` on registration |
| Why it looks vulnerable | Near authentication flows that have weak JWT handling |
| Why it is safe | Passwords are properly hashed with BCrypt, not stored in plaintext |

### DECOY-02 — doctorNotes Stripped in Lists

| Field | Value |
|-------|-------|
| File | `src/services/AppointmentService.ts` |
| Method | `listForUser` |
| Pattern | Destructures `{doctorNotes, ...summary}` from list results |
| Why it looks vulnerable | Adjacent to IDOR detail endpoint |
| Why it is safe | Doctor notes are removed from list responses; only detail endpoint returns them |

### DECOY-03 — Reference Guard Utilities

| Field | Value |
|-------|-------|
| File | `src/referenceGuards.ts` |
| Pattern | `sameOwner()`, `allowedCallback()`, `normalizeIdentifier()` |
| Why it looks vulnerable | Appears to be used for authorization checks |
| Why it is safe | These are proper utility functions that enforce ownership, hostname allowlists, and input normalization |

---

## No-Touch Files During Upgrade

| File | Annotations | Action Allowed? |
|------|------------|-----------------|
| `src/services/TokenService.ts` | VULNERABILITY A07, CHAIN LINK 1 (chain-01) | No direct modification — `jwt.decode()` must remain |
| `src/services/AppointmentService.ts` | VULNERABILITY A01, CHAIN LINK 2 (chain-01) | No direct modification — IDOR must remain |
| `src/config/appConfig.ts` | VULNERABILITY A02 | May add new fields, but `jwtSecret` default and annotation must stay |
| `src/controllers/AuthController.ts` | VULNERABILITY A07 | May add Redis session blacklisting; cookie flags and annotation must stay |
| `src/repositories/UserRepository.ts` | DECOY-01 | May change queries to PG; BCrypt hashing must remain |
| `src/referenceGuards.ts` | DECOY-03 | No modification — safe patterns must stay intact |
| `.vulns` | Ground truth manifest | Update to add entries only; never delete existing |

---

## OWASP Coverage Gap Analysis

| OWASP | Category | Covered? | How |
|-------|----------|----------|-----|
| A01 | Broken Access Control | Yes | VULN-02, Chain Link 2 |
| A02 | Cryptographic Failures | Yes | VULN-03 |
| A03 | Injection | **No** | **Target: Phase 4 (ES DSL injection)** |
| A04 | Insecure Design | **No** | **Target: Phase 2 (schedule override)** |
| A05 | Security Misconfiguration | **No** | **Target: Phase 4 (debug topology leak)** |
| A06 | Vulnerable Components | **No** | **Deferred — future expansion** |
| A07 | Identification & Auth Failures | Yes | VULN-01, VULN-04, Chain Link 1 |
| A08 | Software & Data Integrity | **No** | **Target: Phase 3 (unsafe deserialization)** |
| A09 | Security Logging & Monitoring | **No** | **Target: Phase 3 (missing audit)** |
| A10 | SSRF | **No** | **Target: Phase 4 (search URL SSRF)** |

## Planned Vulnerability Additions

The following vulnerabilities will be planted during the complexity upgrade.

### VULN-05 — Schedule Override Bypass (A04)
| Field | Value |
|-------|-------|
| OWASP | **A04** — Insecure Design |
| CWE | CWE-602 |
| Planned file | `src/services/ScheduleValidator.ts` |
| Planned method | `validateSlot()` |
| Severity | Medium |
| Phase | 2 |
| Chain role | chain-02 step 1 |

### VULN-06 — Unsafe Kafka Deserialization (A08)
| Field | Value |
|-------|-------|
| OWASP | **A08** — Software and Data Integrity Failures |
| CWE | CWE-502 |
| Planned file | `src/consumers/PrescriptionConsumer.ts` |
| Planned method | `processPrescription()` |
| Severity | Medium |
| Phase | 3 |

### VULN-07 — Missing Audit on Prescription (A09)
| Field | Value |
|-------|-------|
| OWASP | **A09** — Security Logging & Monitoring Failures |
| CWE | CWE-778 |
| Planned file | `src/consumers/PrescriptionConsumer.ts` |
| Planned method | `processPrescription()` |
| Severity | Medium |
| Phase | 3 |
| Chain role | chain-02 step 2 |

### VULN-08 — ES DSL Injection (A03)
| Field | Value |
|-------|-------|
| OWASP | **A03** — Injection |
| CWE | CWE-89 |
| Planned file | `src/search/PatientSearchClient.ts` |
| Planned method | `searchPatients()` |
| Severity | High |
| Phase | 4 |

### VULN-09 — SSRF via Search URL (A10)
| Field | Value |
|-------|-------|
| OWASP | **A10** — Server-Side Request Forgery |
| CWE | CWE-918 |
| Planned file | `src/search/PatientSearchClient.ts` |
| Planned method | `searchPatients()` |
| Severity | Medium |
| Phase | 4 |
| Chain role | chain-03 step 2 |

### VULN-10 — Debug Topology Leak (A05)
| Field | Value |
|-------|-------|
| OWASP | **A05** — Security Misconfiguration |
| CWE | CWE-200 |
| Planned file | `src/controllers/DebugController.ts` |
| Planned method | `status()` |
| Severity | Low |
| Phase | 4 |
| Chain role | chain-03 step 1 |

### VULN-11 — IDOR on Clinical Notes (A01)
| Field | Value |
|-------|-------|
| OWASP | **A01** — Broken Access Control |
| CWE | CWE-639 |
| Planned file | `src/services/ClinicalNoteService.ts` |
| Planned method | `getNoteById()` |
| Severity | Medium |
| Phase | 4 |

### Planned Chain Scenarios

| Chain | Name | Steps | Impact | Phases |
|-------|------|-------|--------|--------|
| chain-02 | Schedule Override → Missing Audit → Undetected Prescription Tampering | A04 → A09 | `data_modification` | 2, 3 |
| chain-03 | Debug Topology Leak → SSRF Internal Pivot | A05 → A10 | `lateral_movement` | 4 |

### Planned Decoys

| # | Location | Phase |
|---|----------|-------|
| DECOY-04 | `src/services/ScheduleValidator.ts` → `validateStrict()` | 2 |
| DECOY-05 | `src/consumers/NotificationConsumer.ts` → schema-validated processing | 3 |
| DECOY-06 | `src/search/PatientSearchClient.ts` → `searchPatientsStrict()` | 4 |
| DECOY-07 | `src/search/PatientSearchClient.ts` → `fetchMetadata()` with hostname allowlist | 4 |
