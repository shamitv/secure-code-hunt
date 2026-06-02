const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(appRoot, relativePath));

assert.ok(exists('src/controllers/DeviceController.js'));
assert.ok(exists('src/services/DeviceService.js'));
assert.ok(exists('src/services/RefreshService.js'));
assert.ok(exists('src/services/TelemetryService.js'));
assert.ok(exists('src/services/TelemetryQueryService.js'));
assert.ok(exists('src/repositories/DeviceRepository.js'));
assert.ok(exists('src/repositories/PgDeviceRepository.js'));
assert.ok(exists('src/repositories/PgUserRepository.js'));
assert.ok(exists('src/repositories/TelemetryRepository.js'));
assert.ok(exists('src/db/InMemoryStore.js'));
assert.ok(exists('src/cache/SessionCache.js'));
assert.ok(exists('src/cache/RedisSessionCache.js'));
assert.ok(exists('src/config/db.js'));
assert.ok(exists('src/config/redis.js'));
assert.ok(exists('src/config/migrate.js'));
assert.ok(exists('src/mq/EventProducer.js'));
assert.ok(exists('src/search/DeviceSearchClient.js'));
assert.ok(exists('src/ws/telemetryServer.js'));
assert.ok(exists('src/services/DiagnosticsService.js'));
assert.ok(exists('src/controllers/DiagnosticsController.js'));
assert.ok(exists('src/routes/diagnosticsRoutes.js'));
assert.ok(exists('src/public/dashboard.html'));
assert.ok(exists('src/consumers/TelemetryConsumer.js'));
assert.ok(exists('src/consumers/ValidatedConsumer.js'));
assert.ok(exists('src/mq/KafkaProducer.js'));

const entrypoint = read('src/index.js');
assert.ok(entrypoint.includes('createApp'));
assert.ok(entrypoint.includes('migrate'));
assert.ok(entrypoint.includes('TelemetryWsServer'));
assert.ok(!entrypoint.includes('app.post('));
assert.ok(!entrypoint.includes('axios.get('));

const manifest = JSON.parse(read('.vulns'));
assert.equal(manifest.vulnerabilities.length, 10);

const chain01 = manifest.chained_attacks[0];
assert.equal(chain01.chain_id, 'chain-01');
assert.equal(chain01.impact, 'lateral_movement');
assert.equal(chain01.components.length, 3);
assert.equal(chain01.components[0].method, 'commandError');
assert.equal(chain01.components[1].method, 'refreshStatus');
assert.equal(chain01.components[2].method, 'internalTelemetry');

const chain02 = manifest.chained_attacks[1];
assert.equal(chain02.chain_id, 'chain-02');
assert.equal(chain02.impact, 'db_exfiltration');
assert.equal(chain02.components.length, 2);
assert.equal(chain02.components[0].method, 'getDeviceTelemetry');
assert.equal(chain02.components[1].method, 'queryWithFilter');

assert.ok(read('src/services/DeviceService.js').includes('CHAIN LINK 1 (chain-01)'));
assert.ok(read('src/services/RefreshService.js').includes('CHAIN LINK 2 (chain-01)'));
assert.ok(read('src/services/TelemetryService.js').includes('CHAIN LINK 3 (chain-01)'));
assert.ok(read('src/controllers/DeviceController.js').includes('CHAIN LINK 1 (chain-02)'));
assert.ok(read('src/services/TelemetryQueryService.js').includes('CHAIN LINK 2 (chain-02)'));

const { createApp } = require('../src/app');
const app = createApp();
assert.ok(app);

console.log('app-17 contract checks passed');
