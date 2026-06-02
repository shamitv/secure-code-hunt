# Phase 02: Redis + MongoDB Wiring

## Goal

Wire Redis for session caching and spot vacancy tracking, and MongoDB for parking lot layout documents and dynamic pricing rules. Plant the A05 security misconfiguration vulnerability (unauthenticated debug config endpoint) and its decoy. Establish the cross-DB surface that chain-03 will exploit in Phase 4.

## Scope

### Included
- [ ] Install `redis`, `mongodb` npm packages
- [ ] Add MongoDB service to `docker-compose.yml` with healthcheck
- [ ] Create `src/config/redis.js` — Redis client connection
- [ ] Create `src/config/mongo.js` — MongoDB client connection
- [ ] Create `migrations/003-mongo-setup.js` — MongoDB collection creation and indexes
- [ ] Rewrite `src/cache/SessionCache.js` to use Redis (replacing in-memory `Map`)
- [ ] Create `src/services/LotLayoutService.js` — CRUD for MongoDB lot layout documents
- [ ] Create `src/services/PricingRulesService.js` — CRUD for MongoDB pricing rules
- [ ] Create `src/controllers/AdminController.js` — admin management endpoints
- [ ] Plant **VULN-05 (A05)**: Unauthenticated `GET /api/admin/debug` returns all internal service URLs
- [ ] Plant **Decoy D5**: `GET /api/health` returns only `{ status: 'ok' }`, no internal details
- [ ] Add `GET /api/spots/:id/layout` endpoint (reads from MongoDB, no auth, safe by design)
- [ ] Add `POST /api/admin/layouts` endpoint (admin-only, writes to MongoDB)
- [ ] Update `docker-compose.yml` — add MongoDB service
- [ ] Update `.env.example` — add `REDIS_URL`, `MONGO_URI`
- [ ] Update `.vulns`, `README.md`, `scenarios.md`

### Excluded
- Kafka wiring (Phase 3)
- Elasticsearch real client (Phase 3)
- JWT auth (Phase 4)
- Booking export with cross-DB join (Phase 4)
- Any chain planting — chains are wired in Phase 3 (chain-02) and Phase 4 (chain-03)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Redis for session cache, not JWT | Session tokens remain cookie-based until Phase 4. Redis stores session JSON, replacing in-memory `Map`. Plaintext session data in Redis is the A02 surface for future exploitation. |
| MongoDB for lot layouts and pricing rules | Parking lot geometries (x/y coordinates, zone boundaries) and dynamic pricing rules (holiday overrides, peak multipliers) are inherently document-shaped. Relational tables would require EAV patterns. |
| Debug endpoint in a new `AdminController` | Separates admin ops from spot/booking controllers. Debug endpoint has no auth guard — deliberate A05 vulnerability. |
| `GET /api/spots/:id/layout` queries MongoDB | Cross-DB read path established in Phase 2 but not vulnerable yet. Chain-03 will exploit this pattern in Phase 4. |
| MongoDB added to existing `docker-compose.yml` | Extends existing compose rather than creating a separate one. All 6 services in single compose file. |

## Vulnerability Planting

| # | Type | OWASP | CWE | Location | Description | Severity |
|---|------|-------|-----|----------|-------------|----------|
| 1 | Standalone | A05 | CWE-200 | `src/controllers/AdminController.js` → `debugConfig()` | `GET /api/admin/debug` returns `DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `KAFKA_BROKERS`, `ELASTICSEARCH_URL` with no authentication. Attacker learns internal service topology. | Medium |

## Decoy Patterns

| # | Location | Why it looks vulnerable | Why it is safe |
|---|----------|------------------------|----------------|
| D5 | `src/controllers/HealthController.js` → `health()` | Adjacent file to `AdminController`; also returns JSON about system status | Returns only `{ status: 'ok' }` — zero internal details, no service URLs |

## Data Model Changes

### MongoDB Collections

```js
// lot_layouts
{
  _id: ObjectId,
  lotId: "A-101",                          // matches spots.spot_number in PostgreSQL
  zone: "Level-1-North",
  spotCoordinates: { x: 12.5, y: 34.0 },   // meters from origin
  vehicleRestrictions: {
    maxHeightCm: 210,
    maxWeightKg: 2500,
    evOnly: false
  },
  rules: [
    { rule: "no_overnight", effectiveTime: "22:00-06:00" },
    { rule: "max_duration_hours", value: 24 }
  ],
  createdBy: "admin_attendant",
  createdAt: ISODate
}

// pricing_rules
{
  _id: ObjectId,
  ruleType: "peak_hour",                   // "peak_hour" | "holiday" | "membership_discount"
  effectiveDays: ["Mon","Tue","Wed","Thu","Fri"],
  effectiveHours: { start: "08:00", end: "10:00" },
  multiplier: 1.5,
  restrictions: {
    minDurationHours: 1,
    spotTypes: ["Standard", "Premium"],
    membershipLevels: ["Standard", "Premium", "VIP"]
  },
  createdBy: "admin_attendant",
  createdAt: ISODate
}
```

### Redis Keys

| Key Pattern | Value Type | TTL | Purpose |
|-------------|-----------|-----|---------|
| `session:<token>` | JSON string | 24h | User session data (`{ userId, username, role }`) |
| `spot:<id>:vacancy` | integer | None | Spot occupancy count |

## API Contracts

### New Endpoints

| Method | Path | Auth | Handler | Description | Vuln / Chain |
|--------|------|------|---------|-------------|-------------|
| GET | `/api/admin/debug` | **None** | `AdminController.debugConfig()` | Returns internal service URLs | **A05**, chain-02 step 1 |
| POST | `/api/admin/layouts` | Session (Admin) | `AdminController.createLayout()` | Create MongoDB lot layout document | — |
| GET | `/api/spots/:id/layout` | None | `SpotController.getLayout()` | Get MongoDB lot layout for a spot | — |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/auth/login` | Store session in Redis instead of in-memory `Map` |
| POST | `/api/auth/logout` | Delete session from Redis |
| All | All authenticated routes | `SessionCache.get(token)` now reads from Redis |

## Artifact Updates

- `.vulns`: Add VULN-05 entry (`A05`, `CWE-200`, `AdminController.debugConfig()`); add D5 to decoys
- `README.md`: Update tech stack; add new endpoints; note VULN-05
- `scenarios.md`: Add VULN-05 description
- `.env.example`: Add `REDIS_URL=redis://localhost:6379/36`, `MONGO_URI=mongodb://localhost:27017/parkingdb`
- `docker-compose.yml`: Add `mongodb` service (MongoDB 7, healthcheck)
- `package.json`: Add `redis`, `mongodb` dependencies

## Dependencies on Other Phases

- **Depends on**: Phase 1 — PostgreSQL must be wired and repositories functional
- **Required by**: Phase 3 — chain-02 uses debug endpoint (A05) → SSRF (A10); Phase 4 — chain-03 cross-DB join queries MongoDB and PostgreSQL
