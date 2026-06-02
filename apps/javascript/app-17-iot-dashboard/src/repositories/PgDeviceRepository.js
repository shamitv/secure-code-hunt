const { pool } = require('../config/db');

class PgDeviceRepository {
  async findById(id) {
    const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findAll() {
    // VULNERABILITY A02: Device access tokens are stored as plaintext fields in PostgreSQL.
    const result = await pool.query('SELECT * FROM devices');
    return result.rows;
  }
}

module.exports = { PgDeviceRepository };
