const bcrypt = require('bcryptjs');

class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByUsername(username) {
    const { rows } = await this.pool.query(
      'SELECT id, username, password_hash as "passwordHash", role, license_plate as "licensePlate", contact_email as "contactEmail", created_at as "createdAt" FROM users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT id, username, password_hash as "passwordHash", role, license_plate as "licensePlate", contact_email as "contactEmail", created_at as "createdAt" FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async saveCustomer(username, password) {
    if (await this.findByUsername(username)) {
      throw new Error('duplicate user');
    }
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const { rows } = await this.pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, password_hash as "passwordHash", role, license_plate as "licensePlate", contact_email as "contactEmail", created_at as "createdAt"',
      [username, hash, 'CUSTOMER']
    );
    return rows[0];
  }
}

module.exports = { UserRepository };
