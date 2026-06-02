const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(appRoot, relativePath));

assert.ok(exists("src/controllers/AppointmentController.ts"));
assert.ok(exists("src/services/AppointmentService.ts"));
assert.ok(exists("src/services/TokenService.ts"));
assert.ok(exists("src/repositories/AppointmentRepository.ts"));
assert.ok(exists("src/cache/AppointmentCache.ts"));
assert.ok(exists("src/mq/AuditEventProducer.ts"));
assert.ok(exists("src/search/PatientSearchClient.ts"));

// Phase 2: New files
assert.ok(exists("src/services/ScheduleValidator.ts"));

// Phase 3: New files
assert.ok(exists("src/consumers/PrescriptionConsumer.ts"));
assert.ok(exists("src/consumers/NotificationConsumer.ts"));

// Phase 4: New files
assert.ok(exists("src/controllers/DebugController.ts"));
assert.ok(exists("src/controllers/ClinicalNoteController.ts"));
assert.ok(exists("src/controllers/PatientSearchController.ts"));
assert.ok(exists("src/models/ClinicalNote.ts"));
assert.ok(exists("src/services/ClinicalNoteService.ts"));

const entrypoint = read("src/index.ts");
assert.ok(entrypoint.includes("createApp"));
assert.ok(!entrypoint.includes("app.get("));
assert.ok(!entrypoint.includes("jwt.decode("));

const manifest = JSON.parse(read(".vulns"));
const chain1 = manifest.chained_attacks[0];
assert.equal(chain1.chain_id, "chain-01");
assert.equal(chain1.impact, "db_exfiltration");
assert.equal(chain1.components.length, 2);
assert.equal(chain1.components[0].method, "verify");
assert.equal(chain1.components[1].method, "getAppointmentDetail");

// Assert all three chains exist
assert.equal(manifest.chained_attacks.length, 3);

// chain-02
const chain2 = manifest.chained_attacks[1];
assert.equal(chain2.chain_id, "chain-02");
assert.equal(chain2.impact, "data_modification");
assert.equal(chain2.components.length, 2);

// chain-03
const chain3 = manifest.chained_attacks[2];
assert.equal(chain3.chain_id, "chain-03");
assert.equal(chain3.impact, "lateral_movement");
assert.equal(chain3.components.length, 2);

// Assert standalone vuln count increased
assert.ok(manifest.vulnerabilities.length >= 9);

// Assert decoy count increased
assert.ok(manifest.decoys.length >= 7);

// Assert existing annotations
assert.ok(read("src/services/TokenService.ts").includes("CHAIN LINK 1 (chain-01)"));
assert.ok(read("src/services/AppointmentService.ts").includes("CHAIN LINK 2 (chain-01)"));
assert.ok(read("src/controllers/AuthController.ts").includes("VULNERABILITY A07"));

// Assert new annotations
assert.ok(read("src/services/ScheduleValidator.ts").includes("CHAIN LINK 1 (chain-02)"));
assert.ok(read("src/services/ScheduleValidator.ts").includes("VULNERABILITY A04"));
assert.ok(read("src/consumers/PrescriptionConsumer.ts").includes("CHAIN LINK 2 (chain-02)"));
assert.ok(read("src/consumers/PrescriptionConsumer.ts").includes("VULNERABILITY A08"));
assert.ok(read("src/controllers/DebugController.ts").includes("CHAIN LINK 1 (chain-03)"));
assert.ok(read("src/controllers/DebugController.ts").includes("VULNERABILITY A05"));
assert.ok(read("src/search/PatientSearchClient.ts").includes("CHAIN LINK 2 (chain-03)"));
assert.ok(read("src/search/PatientSearchClient.ts").includes("VULNERABILITY A03"));
assert.ok(read("src/search/PatientSearchClient.ts").includes("VULNERABILITY A10"));
assert.ok(read("src/services/ClinicalNoteService.ts").includes("VULNERABILITY A01"));

console.log("app-14 contract checks passed");
