const { Client } = require('@elastic/elasticsearch');

const searchUrl = process.env.DEVICE_SEARCH_URL || 'http://localhost:9200/iot-devices';
const nodeUrl = searchUrl.replace(/\/[^/]+$/, '');

const esClient = new Client({
  node: nodeUrl
});

async function ensureIndex() {
  const index = 'iot-device-logs';
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    await esClient.indices.create({
      index,
      body: {
        mappings: {
          properties: {
            device_id: { type: 'integer' },
            event_type: { type: 'keyword' },
            message: { type: 'text' },
            timestamp: { type: 'date' }
          }
        }
      }
    });
    console.log('Elasticsearch index created: iot-device-logs');
  }
}

module.exports = { esClient, ensureIndex };
