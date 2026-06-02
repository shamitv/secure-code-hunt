const { Client } = require('@elastic/elasticsearch');

let client = null;
const PARKING_SPOTS_INDEX = 'parking-spots';

function getEsClient(url) {
  if (!client) {
    client = new Client({ node: url });
  }
  return client;
}

async function ensureEsIndex(esClient, pool) {
  const exists = await esClient.indices.exists({ index: PARKING_SPOTS_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: PARKING_SPOTS_INDEX,
    body: {
      mappings: {
        properties: {
          id: { type: 'integer' },
          spotNumber: { type: 'keyword' },
          type: { type: 'keyword' },
          priceRate: { type: 'float' },
          floor: { type: 'integer' },
          isAccessible: { type: 'boolean' }
        }
      }
    }
  });

  const { rows } = await pool.query(
    'SELECT id, spot_number as "spotNumber", type, price_rate as "priceRate", floor, is_accessible as "isAccessible" FROM spots'
  );
  const body = rows.flatMap((doc) => [
    { index: { _index: PARKING_SPOTS_INDEX, _id: doc.id } },
    doc
  ]);
  if (body.length > 0) {
    await esClient.bulk({ body });
  }
}

module.exports = { getEsClient, ensureEsIndex, PARKING_SPOTS_INDEX };
