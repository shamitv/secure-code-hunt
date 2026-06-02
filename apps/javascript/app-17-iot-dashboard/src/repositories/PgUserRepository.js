const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

class PgUserRepository {
  async findByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async saveCustomer(username, password) {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new Error('duplicate user');
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      [username, hash, 'CUSTOMER']
    );
    return result.rows[0];
  }
}

module.exports = { PgUserRepository };
