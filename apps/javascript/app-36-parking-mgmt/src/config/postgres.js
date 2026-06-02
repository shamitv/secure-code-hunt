const { Pool } = require('pg');

let pool = null;

function getPool(databaseUrl) {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl });
    pool.on('error', (err) => console.error('PostgreSQL pool error:', err));
  }
  return pool;
}

module.exports = { getPool };
