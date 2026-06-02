# Phase 04 TODO — Elasticsearch + MongoDB + A03/A10/A05

## Pre-requisites
- [ ] Phase 3 complete and verified
- [ ] Read vuln-inventory.md — confirm no-touch files
- [ ] MongoDB service healthy in docker compose

## Elasticsearch Client
- [ ] Create real `@elastic/elasticsearch` client in `src/config/elasticsearch.ts`
- [ ] Export `getElasticsearch()` singleton
- [ ] Update `src/search/PatientSearchClient.ts`:
  ```typescript
  // VULNERABILITY A03: Elasticsearch query DSL built with raw string concatenation.
  // CHAIN LINK 2 (chain-03): searchUrl parameter overrides target host for SSRF.
  async searchPatients(query: string, searchUrl?: string): Promise<any> {
    const client = searchUrl
      ? new Client({ node: searchUrl })
      : this.client;
    const body = JSON.parse(`{"query": {"match": {"notes": "${query}"}}}`);
    return client.search({ index: "patient-notes", body });
  }

  // DECOY: Parameterized query using structured object
  async searchPatientsStrict(query: string): Promise<any> {
    return this.client.search({
      index: "patient-notes",
      body: { query: { match: { notes: query } } }
    });
  }

  // DECOY: Hostname allowlist before fetch
  async fetchMetadata(url: string): Promise<any> {
    const parsed = new URL(url);
    if (!["localhost", "elasticsearch"].includes(parsed.hostname)) {
      throw new Error("Blocked hostname");
    }
    return { allowed: true };
  }
  ```
- [ ] Add `GET /api/patients/search` route:
  - `PatientSearchController.search()` reads `q` and `search_url` from query params
  - Calls `patientSearchClient.searchPatients(q, req.query.search_url as string)`

## MongoDB + Clinical Notes
- [ ] Create `src/config/mongo.ts` with MongoDB client:
  ```typescript
  const client = new MongoClient(appConfig.mongoUri);
  const db = client.db("telemed_clinical");
  export const clinicalNotesCollection = db.collection("clinical_notes");
  ```
- [ ] Create `src/models/ClinicalNote.ts`:
  ```typescript
  export interface ClinicalNote {
    noteId: string;
    appointmentId: number;
    patientId: number;
    doctorId: number;
    symptoms: string;
    diagnosis: string;
    prescribedMedicines: string[];
    doctorComments: string;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- [ ] Create `src/services/ClinicalNoteService.ts`:
  ```typescript
  // VULNERABILITY A01: Note lookup by ID without patient/doctor ownership checks.
  async getNoteById(noteId: string): Promise<ClinicalNote | null> {
    return clinicalNotesCollection.findOne({ noteId });
  }

  async createNote(note: Omit<ClinicalNote, "noteId" | "createdAt" | "updatedAt">) {
    const doc = { ...note, noteId: uuidv4(), createdAt: new Date(), updatedAt: new Date() };
    await clinicalNotesCollection.insertOne(doc);
    return doc;
  }
  ```
- [ ] Create `src/controllers/ClinicalNoteController.ts`:
  - `getNote(req, res)` → calls service, returns note (no auth check on noteId)
  - `createNote(req, res)` → creates note, associates with appointment
- [ ] Create `src/routes/clinicalNoteRoutes.ts`:
  - `GET /api/clinical-notes/:id`
  - `POST /api/clinical-notes`

## Debug Endpoint (A05 + Chain-03 Step 1)
- [ ] Create `src/controllers/DebugController.ts`:
  ```typescript
  // VULNERABILITY A05: Unauthenticated endpoint exposes internal service topology.
  // CHAIN LINK 1 (chain-03): Leaked URLs enable SSRF pivot to internal services.
  status = (_req: Request, res: Response) => {
    return res.json({
      postgres: appConfig.databaseUrl,
      redis: appConfig.redisUrl,
      kafka: appConfig.kafkaBrokers,
      elasticsearch: appConfig.patientSearchUrl,
      mongodb: appConfig.mongoUri
    });
  };
  ```
- [ ] Create `src/routes/debugRoutes.ts`:
  - `GET /api/internal/status`

## App Wiring
- [ ] Update `src/app.ts`:
  - Import and wire `PatientSearchController`
  - Import and wire `ClinicalNoteController`
  - Import and wire `DebugController`
  - Initialize MongoDB client on startup

## Commit Cadence
- [ ] Commit after ES client + patient search:
  `git add -A && git commit -m "app-14 phase-04: Elasticsearch client, patient search with A03+A10"`
- [ ] Commit after MongoDB + clinical notes + debug:
  `git add -A && git commit -m "app-14 phase-04: MongoDB clinical notes A01, debug endpoint A05, chain-03"`

## Verification
- [ ] `npm run build` passes
- [ ] `GET /api/patients/search?q=allergy` returns results from ES
- [ ] `GET /api/patients/search?q=...&search_url=http://redis:6379` shows SSRF attempt
- [ ] `GET /api/patients/search?q="}], "query": {"match_all": {}}//` — DSL injection bypass
- [ ] `GET /api/clinical-notes/:id` returns note without ownership check
- [ ] `POST /api/clinical-notes` creates note in MongoDB
- [ ] `GET /api/internal/status` returns full topology without auth
- [ ] VULNERABILITY A03, A10, A05, A01 annotations present at all locations
- [ ] CHAIN LINK 1 (chain-03) at DebugController
- [ ] CHAIN LINK 2 (chain-03) at PatientSearchClient
- [ ] Decoys: `searchPatientsStrict()`, `fetchMetadata()` functional
- [ ] All existing vulnerabilities (chain-01, chain-02, A04, A08, A09) still exploitable
- [ ] No changes to no-touch files

## Phase Status Report
- [ ] Create `phase-04/status-report.md`
