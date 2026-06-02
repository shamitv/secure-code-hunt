# Vulnerability Inventory — App 17 (IoT Device Dashboard)

## Purpose

This document catalogs every existing vulnerability, chain link, and decoy pattern in the
application. **No file or annotation listed here may be removed, weakened, or refactored away**
during the complexity upgrade. This is the authoritative no-touch reference for all phases.

Annotation files **may be migrated to new locations** (e.g., `InMemoryStore.js` → PostgreSQL
repository), but annotations must be preserved with identical text and `.vulns` must be updated
to match.

---

## App Profile

| Field | Value |
|---|---|
| App ID | `app-17` |
| Name | IoT Device Dashboard |
| Language | JavaScript |
| Framework | Express |
| File count | ~20 source files |
| Entry point | `src/index.js` |
| Port | 8017 |

---

## Standalone Vulnerabilities (Baseline — DO NOT REMOVE)

### VULN-01: Plaintext Device Tokens in Store

| Field | Value |
|---|---|
| OWASP | A02 — Cryptographic Failures |
| CWE | CWE-312 (Cleartext Storage of Sensitive Information) |
| File | `src/db/InMemoryStore.js` (will migrate to PostgreSQL schema / repository) |
| Method | `constructor()` |
| Line | 12 |
| Severity | medium |
| Annotation | `// VULNERABILITY A02: Device access tokens are stored as plaintext fields.` |

**Exploitation**: Any code path that reads devices (via `DeviceRepository.findAll()`) gets the
plaintext `deviceSecret` field. Currently exposed via `TelemetryService.internalTelemetry()`.

### VULN-02: Debug Configuration Leak

| Field | Value |
|---|---|
| OWASP | A05 — Security Misconfiguration |
| CWE | CWE-209 (Information Exposure Through an Error Message) |
| File | `src/services/DeviceService.js` |
| Method | `commandError()` |
| Line | 30 |
| Severity | medium |
| Annotation | `// VULNERABILITY A05: Debug configuration secrets are returned to authenticated users.` |

**Exploitation**: Any authenticated user sends a command containing `TRIGGER-ERROR`. The error
response includes `gateway_config` with `telemetry_server_url` and `telemetry_access_key`.

### VULN-03: SSRF on Device Status Refresh

| Field | Value |
|---|---|
| OWASP | A10 — Server-Side Request Forgery |
| CWE | CWE-918 |
| File | `src/services/RefreshService.js` |
| Method | `refreshStatus()` |
| Line | 6 |
| Severity | **medium** (requires authentication; simple GET with no header/cookie forwarding) |
| Annotation | `// VULNERABILITY A10: HTTP SSRF reaches internal device/debug endpoints.` |

> **Severity note**: Originally rated `high` in `.vulns`. Downgraded to `medium` in Phase 4 to
> match the chain-01 step 2 classification. The SSRF is gated behind session auth and performs
> only a simple GET request — consistent with a medium rating.

**Exploitation**: Authenticated user sends `POST /api/devices/refresh` with `{"statusUrl": "http://internal:8017/api/internal/telemetry?token=..."}` to trigger a server-side request.

### VULN-04: Plaintext Tokens in Internal Telemetry

| Field | Value |
|---|---|
| OWASP | A02 — Cryptographic Failures |
| CWE | CWE-312 |
| File | `src/services/TelemetryService.js` |
| Method | `internalTelemetry()` |
| Line | 12 |
| Severity | medium |
| Annotation | `// VULNERABILITY A02: Device secrets are stored and returned in plaintext.` |

**Exploitation**: If the telemetry token (`INTERNAL-SECRET-TELEMETRY-TOKEN-2026`) is known
(leaked via VULN-02), the internal telemetry endpoint returns all device records including
plaintext `deviceSecret` values.

---

## Chained Vulnerability Scenarios (Baseline — DO NOT REMOVE)

### chain-01: Debug Config Leak → HTTP SSRF → Plaintext Token Exposure → Lateral Movement

**Chain ID**: `chain-01`

**Impact**: `lateral_movement`

**Attack narrative**: An authenticated user triggers a command error that leaks the internal
telemetry URL and token (`TRIGGER-ERROR` → `commandError()`). They then use the device refresh
SSRF endpoint (`/api/devices/refresh`) with the leaked telemetry URL, causing the server to make
an internal request that returns all device records with plaintext `deviceSecret` fields.

| Step | OWASP | CWE | Severity | Location | Method | Annotation |
|---|---|---|---|---|---|---|
| 1 | A05 | CWE-209 | medium | `src/services/DeviceService.js` | `commandError()` | `// CHAIN LINK 1 (chain-01): Verbose command errors leak internal telemetry URL and token.` |
| 2 | A10 | CWE-918 | medium | `src/services/RefreshService.js` | `refreshStatus()` | `// CHAIN LINK 2 (chain-01): Device refresh fetches caller-controlled URLs server-side.` |
| 3 | A02 | CWE-312 | medium | `src/services/TelemetryService.js` | `internalTelemetry()` | `// CHAIN LINK 3 (chain-01): Internal telemetry returns plaintext device tokens.` |

**Combined impact**: The attacker pivots from a public-facing device command endpoint to the
internal telemetry service, gaining plaintext device API tokens that can be used for lateral
movement against other device-management endpoints.

---

## Decoy Patterns (Baseline — DO NOT REMOVE)

| # | Location | Why it looks vulnerable | Why it is safe |
|---|---|---|---|
| 1 | `src/controllers/DeviceController.js:17-32` (`runCommand`) | Validates command type/length — could look like a bypassable check | Validation is proper: `typeof` check + `length < 200` cap before execution |
| 2 | `src/services/DeviceService.js:39-45` (`getPublicDevice`) | Returns device info by ID — appears to expose device data | Explicitly strips `deviceSecret` field; only returns `id`, `name`, `status` |
| 3 | `src/referenceGuards.js:5-11` (`allowedCallback`) | Validates URLs by hostname allowlist — looks similar to SSRF code path | Properly parses URL, checks protocol (`http:`/`https:` only), validates hostname against a strict allowlist |

---

## No-Touch Files

| File | Reason |
|---|---|
| `src/db/InMemoryStore.js` | Contains VULN A02 annotation (plaintext tokens) |
| `src/services/DeviceService.js` | Contains VULN A05 + CHAIN LINK 1 annotations |
| `src/services/RefreshService.js` | Contains VULN A10 + CHAIN LINK 2 annotations |
| `src/services/TelemetryService.js` | Contains VULN A02 + CHAIN LINK 3 annotations |
| `src/referenceGuards.js` | Contains decoy pattern #3 |
| `src/controllers/DeviceController.js` | Contains decoy pattern #1 |
| `src/services/AuthService.js` | Uses bcrypt correctly; no vulnerabilities |
| `.vulns` | Machine-readable ground truth manifest |
| `README.md` | Contains required chain section |
| `scenarios.md` | Supplementary narrative |

**Important**: When InMemoryStore.js is replaced by PostgreSQL repositories in Phase 1, the
VULN A02 annotation must be replicated at the equivalent location (schema file or repository
method that stores plaintext device secrets). The `.vulns` manifest must be updated to point
to the new location.

---

## OWASP Coverage Gap Analysis (Pre-Upgrade)

| OWASP | Category | Covered? | Target Phase | Planned Vuln |
|---|---|---|---|---|
| A01 | Broken Access Control | **No** | Phase 1 | IDOR on device telemetry endpoint |
| A02 | Cryptographic Failures | Yes (×2) | — | Covered (InMemoryStore + TelemetryService) |
| A03 | Injection | **No** | Phase 1 + 3 | SQLi in telemetry filter (Pg) + ES DSL injection |
| A04 | Insecure Design | **No** | — | Out of scope for this upgrade |
| A05 | Security Misconfiguration | Yes | — | Covered (debug config leak) |
| A06 | Vulnerable & Outdated Components | **No** | — | Out of scope (dependency pinning already done) |
| A07 | Identification & Authentication Failures | **No** | Phase 3 | Unauthenticated WebSocket server |
| A08 | Software & Data Integrity Failures | **No** | Phase 2 | Unsafe deserialization (`eval()`) in Kafka consumer |
| A09 | Security Logging & Monitoring Failures | **No** | Phase 2 | Missing audit trail on event processing |
| A10 | Server-Side Request Forgery | Yes | — | Covered (device status refresh) |

---

## Post-Upgrade Verification Checklist

Per-phase verification to be tracked against this inventory:

- [ ] All 4 existing standalone vulnerability annotations preserved at new locations
- [ ] All 3 chain-01 link annotations preserved
- [ ] All 3 decoy patterns intact and functional
- [ ] A10 standalone severity downgraded from `high` → `medium`
- [ ] All new vulnerabilities annotated with `// VULNERABILITY <OWASP_ID>: <description>`
- [ ] All new chain links annotated with `// CHAIN LINK <N> (chain-<ID>): <description>`
- [ ] `.vulns` manifest updated with all new entries
- [ ] README chain section updated with chain-02
- [ ] scenarios.md updated with chain-02 narrative
- [ ] No-touch files not modified to remove or fix existing vulnerabilities
