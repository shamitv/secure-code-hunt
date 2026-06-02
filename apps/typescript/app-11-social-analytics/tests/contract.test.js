const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(appRoot, relativePath));

assert.ok(exists("src/controllers/PreviewController.ts"));
assert.ok(exists("src/services/PreviewService.ts"));
assert.ok(exists("src/repositories/WidgetRepository.ts"));
assert.ok(exists("src/repositories/DashboardRepository.ts"));
assert.ok(exists("src/cache/SessionCache.ts"));
assert.ok(exists("src/mq/AnalyticsEventProducer.ts"));
assert.ok(exists("src/mq/AnalyticsEventConsumer.ts"));
assert.ok(exists("src/search/InternalSearchClient.ts"));
assert.ok(exists("src/config/db.ts"));

const entrypoint = read("src/index.ts");
assert.ok(entrypoint.includes("createApp"));

const manifest = JSON.parse(read(".vulns"));

// chain-01: Debug -> SSRF -> Internal Search
const chain1 = manifest.chained_attacks.find(c => c.chain_id === "chain-01");
assert.ok(chain1, "chain-01 not found");
assert.equal(chain1.impact, "lateral_movement");
assert.equal(chain1.components.length, 3);

let comp = chain1.components[0];
assert.ok(read("src/controllers/DebugController.ts").includes("CHAIN LINK 1 (chain-01)"));
comp = chain1.components[1];
assert.ok(read("src/services/PreviewService.ts").includes("CHAIN LINK 2 (chain-01)"));
comp = chain1.components[2];
assert.ok(read("src/services/InternalSearchService.ts").includes("CHAIN LINK 3 (chain-01)"));

// chain-02: Widget Config -> Share Token Predictable -> Data Exfiltration
const chain2 = manifest.chained_attacks.find(c => c.chain_id === "chain-02");
assert.ok(chain2, "chain-02 not found");
assert.equal(chain2.impact, "db_exfiltration");

// chain-02 step 2 uses ShareService for predictable tokens
assert.ok(read("src/services/ShareService.ts").includes("CHAIN LINK 2 (chain-02)"),
  "chain-02 step 2 annotation missing in ShareService");

// VULNERABILITY annotations preserved
const appJs = read("public/js/app.js");
assert.ok(appJs.includes("VULNERABILITY A03"), "VULNERABILITY A03 not found in app.js");

const dashboardRepo = read("src/repositories/DashboardRepository.ts");
assert.ok(dashboardRepo.includes("VULNERABILITY A03"), "VULNERABILITY A03 not found in DashboardRepository.ts");

const shareService = read("src/services/ShareService.ts");
assert.ok(shareService.includes("VULNERABILITY A02"), "VULNERABILITY A02 not found in ShareService.ts");

const configController = read("src/controllers/ConfigController.ts");
assert.ok(configController.includes("VULNERABILITY A05"), "VULNERABILITY A05 not found in ConfigController.ts");

const widgetService = read("src/services/WidgetService.ts");
assert.ok(widgetService.includes("VULNERABILITY A04"), "VULNERABILITY A04 not found in WidgetService.ts");

const previewService = read("src/services/PreviewService.ts");
assert.ok(previewService.includes("VULNERABILITY A10"));

const kafkaConsumer = read("src/mq/AnalyticsEventConsumer.ts");
assert.ok(kafkaConsumer.includes("VULNERABILITY A08"));

const internalSearch = read("src/services/InternalSearchService.ts");
assert.ok(internalSearch.includes("VULNERABILITY A01"));

const debugController = read("src/controllers/DebugController.ts");
assert.ok(debugController.includes("VULNERABILITY A05"));

const sessionCache = read("src/cache/SessionCache.ts");
assert.ok(sessionCache.includes("VULNERABILITY A02"));

console.log("app-11 all contract checks passed");
