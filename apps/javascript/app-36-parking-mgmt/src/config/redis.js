const { createClient } = require('redis');

let client = null;

function getRedisClient(url) {
  if (!client) {
    client = createClient({ url });
    client.on('error', (err) => console.error('Redis client error:', err));
    client.connect().catch((err) => console.error('Redis connection error:', err));
  }
  return client;
}

module.exports = { getRedisClient };
