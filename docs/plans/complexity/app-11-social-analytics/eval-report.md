# Evaluation Report — App 11 (Social Media Analytics Dashboard)

> **Status**: [ ] Pending — to be completed during Phase 6 verification.
>
> This report documents difficulty ratings and hint leakage validation for the upgraded app-11-social-analytics.

---

## Difficulty Assessment

### Standalone Vulnerabilities

| ID | OWASP | CWE | Location | Difficulty | Rationale |
|----|-------|-----|----------|------------|-----------|
| VULN-01 | A10 | CWE-918 | `src/services/PreviewService.ts` -> `fetchPreview()` | 1 | Single POST with `url` field, no authentication required |
| VULN-02 | A05 | CWE-200 | `src/controllers/DebugController.ts` -> `getConfig()` | 1 | Single GET request, no authentication required |
| VULN-03 | A01 | CWE-287 | `src/services/InternalSearchService.ts` -> `adminSearch()` | 2 | Requires token from VULN-02 (1-hop chaining) to craft internal search URL |
| VULN-04 | A03 (XSS) | CWE-79 | `public/js/app.js` -> `loadWidgets()` | 2 | Create a widget via API, view dashboard — outputs unencoded `innerHTML` |
| VULN-05 | A05 | CWE-312 | `public/js/app.js` -> global scope | 1 | View page source — API key is hardcoded in bundle |
| VULN-06 | A03 (SQLi) | CWE-89 | `src/repositories/DashboardRepository.ts` -> `search()` | 1 | Single GET with `q` param, raw string interpolation, no auth required |
| VULN-07 | A05 | CWE-200 | `src/controllers/ConfigController.ts` -> `getEnv()` | 1 | Single GET request, returns entire `process.env`, no auth required |
| VULN-08 | A02 | CWE-331 | `src/services/ShareService.ts` -> `generateToken()` | 3 | Requires understanding XOR encoding scheme, crafting tokens for enum IDs |
| VULN-09 | A08 | CWE-502 | `src/mq/AnalyticsEventConsumer.ts` -> `handleEvent()` | 3 | Requires crafting Kafka message via REST API, then observing consumer-side `eval()` execution |
| VULN-10 | A07 | CWE-306 | `src/index.ts` -> WS upgrade handler | 2 | Requires WebSocket client; connect to `/ws/live` without any auth credentials |
| VULN-11 | A04 | CWE-451 | `src/controllers/WidgetController.ts` -> `createWidget()` | 1 | Single POST with arbitrary `config` JSON, no validation |

### Chained Scenarios

| Chain | Steps | Impact | Difficulty | Rationale |
|-------|-------|--------|------------|-----------|
| chain-01 | A05 -> A10 -> A01 | `lateral_movement` | 3 | Three-step across debug leak, SSRF, and internal service pivot. Requires reading debug config then crafting internal URL for SSRF. |
| chain-02 | A04 -> A02 | `data_modification` | 4 | Two-step chain requiring widget config injection (A04) then share token enumeration (A02). Attacker must understand XOR encoding AND craft a malicious widget. |

### Difficulty Distribution

| Rating | Count | Vulns |
|--------|-------|-------|
| 1 (Trivial) | 6 | VULN-01, VULN-02, VULN-05, VULN-06, VULN-07, VULN-11 |
| 2 (Easy) | 3 | VULN-03, VULN-04, VULN-10 |
| 3 (Moderate) | 3 | VULN-08, VULN-09, chain-01 |
| 4 (Hard) | 1 | chain-02 |
| 5 (Expert) | 0 | — |

---

## Hint Leakage Validation

### Search Scope

| Scope | Files Scanned | Matches Outside Permitted | Status |
|-------|---------------|--------------------------|--------|
| `.ts` source files (excl. `.vulns`, `README.md`, `scenarios.md`, `docs/`) | [ ] TBD | [ ] | [ ] |
| `.js` and `.html` files | [ ] TBD | [ ] | [ ] |
| `.sql` and `.json` files (excl. `.vulns`, `package.json`) | [ ] TBD | [ ] | [ ] |
| `Dockerfile`, `docker-compose.yml` | [ ] TBD | [ ] | [ ] |
| Test files | [ ] TBD | [ ] | [ ] |

### Search Commands Used

```powershell
# TypeScript source files
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.ts" -g "!**/.vulns" -g "!**/README.md" -g "!**/scenarios.md" -g "!docs/plans/complexity/**"

# JavaScript and HTML files
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.{js,html}" -g "!docs/plans/complexity/**"

# SQL, JSON config
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics -g "*.{sql,json}" -g "!**/.vulns" -g "!**/package.json" -g "!**/tsconfig.json"

# Infrastructure files
rg -n "VULNERABILITY|CHAIN LINK|DECOY|intentional vuln|benchmark" apps/typescript/app-11-social-analytics/Dockerfile apps/typescript/app-11-social-analytics/docker-compose.yml
```

### Result

> **Expected**: ZERO matches outside the permit list (annotation comments, `.vulns`, `README.md` chain section, `scenarios.md`, `docs/plans/`).
>
> **Actual**: [ ] TBD — to be filled during Phase 6 verification.

---

## OWASP Coverage Summary

| Category | Covered | Source |
|----------|---------|--------|
| A01 — Broken Access Control | ✅ | VULN-03 (InternalSearchService), chain-01 step 3 |
| A02 — Cryptographic Failures | ✅ | VULN-08 (ShareService XOR token), chain-02 step 2 |
| A03 — Injection | ✅ | VULN-04 (XSS), VULN-06 (SQLi) |
| A04 — Insecure Design | ✅ | VULN-11 (Widget config abuse), chain-02 step 1 |
| A05 — Security Misconfiguration | ✅ | VULN-02 (Debug config), VULN-05 (Hardcoded key), VULN-07 (Env dump) |
| A06 — Vulnerable Components | ❌ | Not planted (risks real CVEs) |
| A07 — Identification & Auth Failures | ✅ | VULN-10 (WS no auth) |
| A08 — Software & Data Integrity | ✅ | VULN-09 (Kafka eval deserialization) |
| A09 — Logging & Monitoring | ❌ | Not planted (no natural fit in this domain) |
| A10 — Server-Side Request Forgery | ✅ | VULN-01 (Link preview SSRF), chain-01 step 2 |

**8/10 categories covered.**

---

## Benchmark Statistics

| Metric | Before Upgrade | After Upgrade |
|--------|---------------|---------------|
| Standalone vulnerabilities | 5 | 11 |
| Chained scenarios | 1 | 2 |
| Decoy patterns | 2 | 10+ |
| OWASP categories | 5/10 | 8/10 |
| Source files | 30 | ~50 |
| API endpoints | 12 | ~19 |
| Infrastructure services | 4 (stubbed) | 4 (real) |
| Difficulty range | 1--3 | 1--4 |
