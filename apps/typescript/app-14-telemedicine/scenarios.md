# Chained Vulnerability Scenarios — Telemedicine

Supplemental notes only. Ground truth vulnerability data is maintained in [.vulns](.vulns), and the required human-readable chain is in [README.md](README.md).

## Chain 1: "Weak JWT Validation → Patient Notes IDOR"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | JWT payload is decoded without validating the signature | Medium | A07 | `TokenService.ts` → `verify()` |
| 2 | Appointment details expose physician notes by ID without owner/doctor checks | Medium | A01 | `AppointmentService.ts` → `getAppointmentDetail()` |

**Attack narrative**: The attacker supplies a forged JWT payload, then enumerates `/api/appointments/:id` to retrieve appointment records and confidential doctor notes.

**Combined Impact**: Database exfiltration of patient appointment records and physician notes.

---

## Chain 2: "Schedule Override → Missing Audit → Undetected Prescription Tampering"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Schedule validator skips overlap check when allowOverride=true | Low | A04 | `ScheduleValidator.ts` → `validateSlot()` |
| 2 | Prescription consumer writes to DB without audit trail entries | Low | A09 | `PrescriptionConsumer.ts` → `processPrescription()` |

**Attack narrative**: An attacker passes `allowOverride=true` to book an overlapping appointment, then the prescription Kafka consumer processes the resulting event and writes prescription data to PostgreSQL without any audit log entry.

**Combined Impact**: Undetected creation of unauthorized prescription records (data modification).

---

## Chain 3: "Debug Topology Leak → SSRF Internal Pivot"

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Debug endpoint exposes internal service URLs without authentication | Low | A05 | `DebugController.ts` → `status()` |
| 2 | Patient search accepts search_url parameter to override ES target host | Low | A10 | `PatientSearchClient.ts` → `searchPatients()` |

**Attack narrative**: An attacker hits `GET /api/internal/status` to retrieve internal service hostnames, then pivots via the SSRF-vulnerable `search_url` parameter.

**Combined Impact**: Lateral movement from compromised debug endpoint to internal services.
