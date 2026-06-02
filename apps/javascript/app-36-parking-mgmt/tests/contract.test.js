const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(appRoot, relativePath));

assert.ok(exists('src/controllers/BookingController.js'));
assert.ok(exists('src/controllers/AdminController.js'));
assert.ok(exists('src/controllers/ExportController.js'));
assert.ok(exists('src/producers/BookingProducer.js'));
assert.ok(exists('src/consumers/BookingConsumer.js'));
assert.ok(exists('src/services/ExportService.js'));
assert.ok(exists('src/services/DynamicPricing.js'));
assert.ok(exists('src/services/SpotPhotoService.js'));
assert.ok(exists('src/middleware/jwtAuth.js'));
assert.ok(exists('src/middleware/adminOnly.js'));
assert.ok(exists('src/config/appConfig.js'));
assert.ok(exists('views/dashboard.ejs'));
assert.ok(exists('public/css/dashboard.css'));

const entrypoint = read('src/index.js');
assert.ok(entrypoint.includes('createApp'));

const manifest = JSON.parse(read('.vulns'));
assert.equal(manifest.vulnerabilities.length, 7);

const chain01 = manifest.chained_attacks[0];
assert.equal(chain01.components.length, 3);

const chain02 = manifest.chained_attacks[1];
assert.equal(chain02.components.length, 2);

const chain03 = manifest.chained_attacks[2];
assert.equal(chain03.components.length, 3);
assert.equal(chain03.impact, 'db_exfiltration');

const decoys = manifest.decoys;
assert.equal(decoys.length, 8);

assert.ok(read('src/search/ParkingSearchClient.js').includes('CHAIN LINK 1 (chain-01)'));
assert.ok(read('src/producers/BookingProducer.js').includes('CHAIN LINK 2 (chain-01)'));
assert.ok(read('src/consumers/BookingConsumer.js').includes('CHAIN LINK 3 (chain-01)'));
assert.ok(read('src/controllers/AdminController.js').includes('CHAIN LINK 1 (chain-02)'));
assert.ok(read('src/services/SpotPhotoService.js').includes('CHAIN LINK 2 (chain-02)'));
assert.ok(read('src/config/appConfig.js').includes('CHAIN LINK 1 (chain-03)'));
assert.ok(read('src/middleware/jwtAuth.js').includes('CHAIN LINK 2 (chain-03)'));
assert.ok(read('src/services/ExportService.js').includes('CHAIN LINK 3 (chain-03)'));

console.log('app-36 Phase 4 contract checks passed');
