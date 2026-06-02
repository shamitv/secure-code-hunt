# Phase 06: Verification + Metadata Synchronization

## Goal

Perform a complete audit of all vulnerabilities (existing + new), chain scenarios, and decoy patterns. Synchronize `.vulns`, `README.md`, and `scenarios.md` with all planted benchmarks. Run hint-leakage validation across all source files. Generate `eval-report.md` with difficulty ratings. Run the full integration test suite via Docker Compose. This is the final quality-gate phase.

## Scope

### Included
- [ ] Verify every standalone vulnerability (11 total) is exploitable via Docker Compose
- [ ] Verify every chain scenario (2 total) works end-to-end
- [ ] Verify every decoy pattern (10+ total) is present and functional
- [ ] Synchronize `.vulns` with all vulnerabilities, chains, and decoys
- [ ] Synchronize `README.md` with all endpoints, features, and chain narratives
- [ ] Synchronize `scenarios.md` with complete attack narratives for both chains
- [ ] Run hint leakage validation (search all source for benchmark keywords outside annotations)
- [ ] Generate `eval-report.md` with difficulty ratings (1--5 scale) for each vuln and chain
- [ ] Run `npm test` (contract tests) via Docker Compose
- [ ] Tear down Docker Compose resources

### Excluded
- No new code, features, or vulnerabilities
- No refactoring (only metadata edits)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Phase 6 is metadata-only | All code changes completed in Phases 1--5; this gates quality |
| Hint leakage search covers `.ts`, `.js`, `.html`, `.sql`, `.json`, `Dockerfile` | Excludes `.vulns`, `README.md`, `scenarios.md`, `docs/plans/complexity/**` |
| Difficulty ratings per the generic upgrade guide §7.1 | 1 = single HTTP request, 5 = 3+ steps across services with specialized payloads |
| Contract tests run inside Docker container | Ensures end-to-end environment matches deployment |

## Full Vulnerability Inventory (Post-Upgrade)

| ID | OWASP | Location | Type | Phase Added |
|----|-------|----------|------|-------------|
| VULN-01 | A10 | `PreviewService.fetchPreview()` | Standalone + chain-01 step 2 | Existing |
| VULN-02 | A05 | `DebugController.getConfig()` | Standalone + chain-01 step 1 | Existing |
| VULN-03 | A01 | `InternalSearchService.adminSearch()` | Standalone + chain-01 step 3 | Existing |
| VULN-04 | A03 | `public/js/app.js` (innerHTML) | Standalone (XSS) | Existing |
| VULN-05 | A05 | `public/js/app.js` (hardcoded key) | Standalone | Existing |
| VULN-06 | A03 | `DashboardRepository.search()` | Standalone (SQLi) | Phase 2 |
| VULN-07 | A05 | `ConfigController.getEnv()` | Standalone (env leak) | Phase 2 |
| VULN-08 | A02 | `ShareService.generateToken()` | Standalone + chain-02 step 2 | Phase 3 |
| VULN-09 | A08 | `AnalyticsEventConsumer.handleEvent()` | Standalone | Phase 4 |
| VULN-10 | A07 | WS upgrade handler in `index.ts` | Standalone | Phase 5 |
| VULN-11 | A04 | `WidgetController.createWidget()` | Chain-02 step 1 | Phase 2/4 |

## Chain Scenarios (Post-Upgrade)

| Chain | Steps | Impact | Phases |
|-------|-------|--------|--------|
| chain-01 | A05 debug leak -> A10 SSRF -> A01 internal pivot | `lateral_movement` | Existing |
| chain-02 | A04 widget config poison -> A02 weak share token | `data_modification` | Phases 2--3 |

## Artifact Updates

- `apps/typescript/app-11-social-analytics/.vulns` — final sync: all 11 vulns, 2 chains, all decoys
- `apps/typescript/app-11-social-analytics/README.md` — final sync: endpoint table, chain section, feature list
- `apps/typescript/app-11-social-analytics/scenarios.md` — final sync: complete attack narratives
- `docs/plans/complexity/app-11-social-analytics/eval-report.md` — new: difficulty ratings + hint leakage

## Dependencies on Other Phases

- **Depends on**: All Phases 1--5 complete
- **No phases depend on this one** — it is the terminal quality gate
