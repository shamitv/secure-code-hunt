# Phase 04: Elasticsearch + MongoDB Integration + Search/Notes Vulnerabilities (A03, A10, A05)

## Goal

Wire up real Elasticsearch client and add MongoDB for clinical notes. Plant A03 (ES DSL injection), A10 (SSRF via search URL), and A05 (debug topology leak). Plant chain-03.

## Scope

### Included
- Wire real `@elastic/elasticsearch` in `PatientSearchClient`
- Add MongoDB client and clinical notes service
- Plant VULNERABILITY A03 (ES DSL injection in patient search)
- Plant VULNERABILITY A10 (SSRF via `search_url` parameter)
- Plant VULNERABILITY A05 (debug endpoint leaks internal topology)
- Plant CHAIN LINK 1 (chain-03) in DebugController
- Plant CHAIN LINK 2 (chain-03) in PatientSearchClient
- Add clinical note endpoints (A01 IDOR extension)
- Add decoys: parameterized ES query, URL allowlist

### Excluded
- Verification (Phase 5)
- eval-report (Phase 5)
- UI/dashboards (out of scope)

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Chain Link 1 (chain-03) | A05 | CWE-200 | `src/controllers/DebugController.ts` → `status()` | Unauthenticated debug endpoint returns ES URL, Redis host, Kafka brokers, MongoDB URI | Low |
| 2 | Standalone | A03 | CWE-89 | `src/search/PatientSearchClient.ts` → `searchPatients()` | Elasticsearch query DSL built with raw string concatenation from user input | High |
| 3 | Chain Link 2 (chain-03) | A10 | CWE-918 | `src/search/PatientSearchClient.ts` → `searchPatients()` | `search_url` query parameter overrides target host, enabling SSRF to internal services | Medium |
| 4 | Standalone | A01 | CWE-639 | `src/services/ClinicalNoteService.ts` → `getNoteById()` | Clinical notes returned by ID without patient/doctor ownership checks | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/search/PatientSearchClient.ts` → `searchPatientsStrict()` | Same file, also performs ES queries | Uses parameterized `search()` with structured query object, no string interpolation |
| 2 | `src/search/PatientSearchClient.ts` → `fetchMetadata()` | Same file, also accepts URL parameter | Validates hostname against allowlist before making HTTP request |

## API Contracts

### New: `GET /api/patients/search?q=<term>&search_url=<url>`

```json
{
  "results": ["..."],
  "query": "..."
}
```

### New: `GET /api/clinical-notes/:id`

Returns clinical note document from MongoDB by ID without ownership check.

### New: `POST /api/clinical-notes`

```json
{
  "appointmentId": 2,
  "symptoms": "...",
  "diagnosis": "...",
  "prescribedMedicines": ["..."],
  "doctorComments": "..."
}
```

### New: `GET /api/internal/status`

Returns internal service topology (PG host, Redis host, Kafka brokers, ES URL, MongoDB URI) without authentication.

## Artifact Updates

- `.vulns`: Add VULN-08 (A03), VULN-09 (A10), VULN-10 (A05), VULN-11 (A01 on notes)
- `README.md`: Add new endpoints, chain-03 table, architecture
- `scenarios.md`: Add chain-03 narrative

## Dependencies on Other Phases

- **Depends on**: Phase 1 (MongoDB + PG), Phase 3 (Kafka events from search)
- **Required by**: Phase 5 (verification)
