# Vulnerability Inventory — App 11 (Social Media Analytics Dashboard)

## Purpose

This document enumerates every intentionally planted vulnerability, chain link, and decoy in the **current** app-11 codebase. It serves as a **no-touch zone** reference during the upgrade — no implementation step may remove, weaken, or fix any item listed here.

---

## App Profile

| Property | Value |
|----------|-------|
| App ID | `app-11` |
| Language | TypeScript |
| Framework | Express |
| Source file count | 30 |
| Complexity rating | 3 — Moderate |
| Entry point | `src/index.ts` (Express factory via `src/app.ts`) |
| Manifest | `.vulns` |

---

## Standalone Vulnerabilities

### VULN-01 — SSRF on Link Preview

| Field | Value |
|-------|-------|
| OWASP | **A10** — Server-Side Request Forgery |
| CWE | CWE-918 |
| File | `src/services/PreviewService.ts` |
| Method | `fetchPreview` |
| Line range | 4--17 |
| Severity | High |
| Source Comment | `// VULNERABILITY A10: axios fetches arbitrary URLs, enabling HTTP SSRF.` |
| Description | Preview service fetches any caller-supplied URL via `axios.get()` with no scheme, hostname, or IP-range restrictions. Can target internal Docker containers. |

### VULN-02 — Debug Configuration Exposure

| Field | Value |
|-------|-------|
| OWASP | **A05** — Security Misconfiguration |
| CWE | CWE-200 |
| File | `src/controllers/DebugController.ts` |
| Method | `getConfig` |
| Line range | 7--10 |
| Severity | Medium |
| Source Comment | `// VULNERABILITY A05: Debug configuration leak reveals internal service connection metadata.` |
| Description | Unauthenticated `GET /api/debug/config` returns `internalSearchUrl`, `internalSearchToken`, and other infrastructure connection strings from `appConfig`. |

### VULN-03 — Internal Search Access Control

| Field | Value |
|-------|-------|
| OWASP | **A01** — Broken Access Control |
| CWE | CWE-287 |
| File | `src/services/InternalSearchService.ts` |
| Method | `adminSearch` |
| Line range | 6--20 |
| Severity | Medium |
| Source Comment | `// VULNERABILITY A01: Internal admin search relies only on a bearer-style service token.` |
| Description | Internal search admin endpoint trusts a leaked bearer token. No additional authentication or session validation. Returns internal service topology including cluster names and next-hop URLs. |

### VULN-04 — Stored XSS via innerHTML

| Field | Value |
|-------|-------|
| OWASP | **A03** — Injection |
| CWE | CWE-79 |
| File | `public/js/app.js` |
| Method | `loadWidgets` |
| Line range | 64--80 |
| Severity | High |
| Source Comment | (None in JS file — documented in `.vulns` only) |
| Description | Widget titles are rendered with `element.innerHTML = widget.title` without HTML encoding, allowing stored XSS. Widget data is loaded from the API and rendered unsafely in the browser DOM. |

### VULN-05 — Hardcoded API Key in Browser Bundle

| Field | Value |
|-------|-------|
| OWASP | **A05** — Security Misconfiguration |
| CWE | CWE-312 |
| File | `public/js/app.js` |
| Method | `global` |
| Line range | 1--2 |
| Severity | Medium |
| Source Comment | (None in JS file — documented in `.vulns` only) |
| Description | Internal reporting API key (`rpt_live_internal_44f8a2`) is hardcoded in the client-side JavaScript bundle, visible to any visitor who inspects the page source. |

---

## Chained Vulnerability Scenarios

### chain-01 — Debug Config Leak -> HTTP SSRF -> Internal Search Pivot -> lateral_movement

**Impact**: `lateral_movement` — Attacker pivots from the public analytics app into internal service topology.

| Step | Issue | OWASP | Severity | CWE | File | Method | Annotation |
|------|-------|-------|----------|-----|------|--------|------------|
| 1 | Debug endpoint exposes internal search URL and service token | A05 | Medium | CWE-200 | `src/controllers/DebugController.ts` | `getConfig` | `// CHAIN LINK 1 (chain-01): Debug output exposes internal search URL and service token.` |
| 2 | Preview service fetches caller-supplied URLs with no internal network restrictions | A10 | Medium | CWE-918 | `src/services/PreviewService.ts` | `fetchPreview` | `// CHAIN LINK 2 (chain-01): User-controlled URL is fetched server-side with no internal network restrictions.` |
| 3 | Internal search admin endpoint trusts the leaked token and exposes service topology | A01 | Low | CWE-287 | `src/services/InternalSearchService.ts` | `adminSearch` | `// CHAIN LINK 3 (chain-01): Internal search trusts the leaked token and exposes service topology.` |

**Attack narrative**: The attacker calls `GET /api/debug/config` to obtain `internalSearchUrl` and `internalSearchToken`, then submits that internal URL to `POST /api/preview`. The SSRF response returns internal cluster names (`campaign-index`, `influencer-index`, `billing-export-index`) and an internal next-hop URL (`http://search-admin.internal:9200/_cat/indices`) that would otherwise be unreachable from the public network.

---

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/referenceGuards.ts` -> `allowedCallback` | Accepts a URL parameter and performs an HTTP request — same pattern as PreviewService SSRF | Validates scheme (`https` only) and hostname against a hardcoded allowlist before fetching |
| 2 | `src/cache/SessionCache.ts` -> `createSession` | Generates session tokens — could be flagged as weak randomness | Uses `crypto.randomBytes` for opaque, unpredictable session IDs |

---

## No-Touch Files

The following files contain existing vulnerability or chain annotations and **must not be modified** during the upgrade:

| File | Annotations | Reason |
|------|------------|--------|
| `src/controllers/DebugController.ts` | `// CHAIN LINK 1`, `// VULNERABILITY A05` | Preserve chain-01 step 1 + A05 standalone |
| `src/services/PreviewService.ts` | `// CHAIN LINK 2`, `// VULNERABILITY A10` | Preserve chain-01 step 2 + A10 standalone |
| `src/services/InternalSearchService.ts` | `// CHAIN LINK 3`, `// VULNERABILITY A01` | Preserve chain-01 step 3 + A01 standalone |
| `src/referenceGuards.ts` | Decoy pattern | Preserve decoy-01 |
| `src/cache/SessionCache.ts` | Decoy pattern | Preserve decoy-02 |
| `public/js/app.js` | VULN-04 (XSS) + VULN-05 (hardcoded key) | Preserve existing client-side vulnerabilities |

---

## OWASP Coverage Gap Analysis

| OWASP Category | Covered? | Source |
|----------------|----------|--------|
| A01 — Broken Access Control | ✅ | VULN-03 (InternalSearchService), chain-01 step 3 |
| A02 — Cryptographic Failures | ❌ | **Gap** — target for Phase 3 |
| A03 — Injection | ✅ | VULN-04 (XSS in JS) — SQL injection added in Phase 2 for full coverage |
| A04 — Insecure Design | ❌ | **Gap** — target for Phase 4 |
| A05 — Security Misconfiguration | ✅✅ | VULN-02 (Debug), VULN-05 (Hardcoded key) |
| A06 — Vulnerable Components | ❌ | Not targeted (needs real dependency with known CVE — risky to plant) |
| A07 — Auth Failures | ❌ | **Gap** — target for Phase 5 |
| A08 — Data Integrity | ❌ | **Gap** — target for Phase 4 |
| A09 — Logging & Monitoring | ❌ | Not targeted (hard to plant naturally in this domain) |
| A10 — SSRF | ✅ | VULN-01 (PreviewService), chain-01 step 2 |

**5/10 covered before upgrade. Target: 8/10 after upgrade.**
