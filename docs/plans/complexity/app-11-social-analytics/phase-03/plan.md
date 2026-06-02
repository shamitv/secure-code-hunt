# Phase 03: Elasticsearch Search Layer + Dashboard Share Tokens

## Goal

Initialize the Elasticsearch client, create the `comments` index with appropriate mapping, implement the `SyncManager` to stream analytics events from PostgreSQL into Elasticsearch, and build the social feed search endpoint. Also implement the dashboard share token system with intentionally weak XOR-based token generation (A02). By end of phase, users can search feed comments and share dashboards via guessable tokens.

## Scope

### Included
- [ ] Create `src/config/elasticClient.ts` — ES client singleton with connection retry
- [ ] Create `src/config/esMappings.ts` — `comments` index mapping with analyzers
- [ ] Create `src/services/SyncManager.ts` — polls `analytics_events` table, bulk-indexes comment-type events into ES
- [ ] Create `src/services/ShareService.ts` — generate/validate dashboard share tokens (A02 injection point)
- [ ] Create `src/controllers/SocialSearchController.ts` — feed comment search endpoint
- [ ] Create `src/controllers/ShareController.ts` — share token generation + access endpoints
- [ ] Create `src/routes/searchRoutes.ts` and `src/routes/shareRoutes.ts`
- [ ] **Plant A02 (Weak Crypto)**: `ShareService.generateToken()` uses XOR with hardcoded key on sequential ID
- [ ] **Complete chain-02 step 2**: Weak share token enables dashboard access enumeration

### Excluded
- No real Kafka integration (still using in-process stubs from Phase 1 until Phase 4)
- No WebSocket or UI changes (Phase 5)
- No changes to annotation-bearing files (see vuln-inventory no-touch list)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| ES index created at app startup | Simple dev-benchmark pattern — no migration framework needed |
| SyncManager polls DB every 30s | Simulates real-world sync daemon; avoids Kafka dependency for now |
| Share token = XOR(sequential ID, hardcoded key) | Classic weak-crypto anti-pattern — attacker can enumerate dashboard IDs |
| `GET /api/search/feed?q=...` queries ES directly | Realistic feature for social media analytics searching comment feeds |
| `GET /api/search/user/:userId` uses parameterized ES query in same controller | Decoy — adjacent endpoint, similar pattern, but parameterized |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone + Chain Link 2 (chain-02) | A02 | CWE-331 | `src/services/ShareService.ts` -> `generateToken()` | Dashboard share token is XOR-encoded sequential dashboard ID with hardcoded 4-byte key. Attacker can generate tokens for any numeric ID to access arbitrary shared dashboards. | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| 1 | `src/services/ShareService.ts` -> `generateShareLink()` | Same service, also generates share-related token for another entity | Uses `crypto.randomBytes(32).toString('hex')` — cryptographically random |
| 2 | `GET /api/search/user/:userId` in SocialSearchController | Same controller, also queries Elasticsearch with user input | Constructs ES query with parameterized `term` clause, not raw string interpolation |

## Data Model Changes

### New Elasticsearch Index

```json
// comments index mapping
{
  "mappings": {
    "properties": {
      "id": { "type": "integer" },
      "widget_id": { "type": "integer" },
      "user_id": { "type": "integer" },
      "text": { "type": "text", "analyzer": "standard" },
      "sentiment": { "type": "keyword" },
      "timestamp": { "type": "date" }
    }
  }
}
```

### ShareService Token Logic (Intentional Weakness)

```typescript
// VULNERABILITY A02: Share token uses XOR encryption with a hardcoded key on sequential IDs.
// CHAIN LINK 2 (chain-02): Predictable share tokens allow enumeration of victim dashboards.

const SHARE_KEY = 0x4F; // hardcoded single-byte XOR key

generateToken(dashboardId: number): string {
  const encrypted = dashboardId ^ SHARE_KEY;
  return Buffer.from(String(encrypted)).toString('base64');
}

validateToken(token: string): number | null {
  const decoded = Buffer.from(token, 'base64').toString();
  const dashboardId = parseInt(decoded) ^ SHARE_KEY;
  return isNaN(dashboardId) ? null : dashboardId;
}
```

## API Contracts

### New Endpoints

| Method | Path | Auth | Description | Controller |
|--------|------|------|-------------|------------|
| GET | `/api/search/feed?q=...` | ANY | Searches feed comments via Elasticsearch | `SocialSearchController.search()` |
| GET | `/api/search/user/:userId` | ANY | User-scoped parameterized ES search (decoy) | `SocialSearchController.searchByUser()` |
| GET | `/api/dashboards/:id/share` | ANY | Generates share token for a dashboard (A02) | `ShareController.share()` |
| POST | `/api/dashboards/shared/:token` | ANY | Access a shared dashboard by token (A02) | `ShareController.access()` |

## Artifact Updates

- `apps/typescript/app-11-social-analytics/src/config/elasticClient.ts` — new file
- `apps/typescript/app-11-social-analytics/src/config/esMappings.ts` — new file
- `apps/typescript/app-11-social-analytics/src/services/SyncManager.ts` — new file
- `apps/typescript/app-11-social-analytics/src/services/ShareService.ts` — new file
- `apps/typescript/app-11-social-analytics/src/controllers/SocialSearchController.ts` — new file
- `apps/typescript/app-11-social-analytics/src/controllers/ShareController.ts` — new file
- `apps/typescript/app-11-social-analytics/src/routes/searchRoutes.ts` — new file
- `apps/typescript/app-11-social-analytics/src/routes/shareRoutes.ts` — new file
- `apps/typescript/app-11-social-analytics/src/app.ts` — wire new routes and DI
- `apps/typescript/app-11-social-analytics/.vulns` — add VULN-08 (A02), update chain-02 with step 2
- `apps/typescript/app-11-social-analytics/README.md` — update endpoint table, complete chain-02 section
- `apps/typescript/app-11-social-analytics/scenarios.md` — complete chain-02 narrative

## Dependencies on Other Phases

- **Depends on**: Phase 2 — `share_tokens` table + `dashboards` table + `analytics_events` table must exist
- **Required by**: Phase 5 — dashboard UI needs share token functionality + ES search for feed panel
