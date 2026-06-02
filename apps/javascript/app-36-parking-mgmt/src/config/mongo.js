const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function getMongoDb(url) {
  if (!client) {
    client = new MongoClient(url);
    await client.connect();
    db = client.db('parkingdb');
  }
  return db;
}

module.exports = { getMongoDb };
