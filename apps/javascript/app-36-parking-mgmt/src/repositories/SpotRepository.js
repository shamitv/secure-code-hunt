class SpotRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async save(input) {
    const { rows } = await this.pool.query(
      'INSERT INTO spots (spot_number, type, price_rate, floor, is_accessible) VALUES ($1, $2, $3, $4, $5) RETURNING id, spot_number as "spotNumber", type, price_rate as "priceRate", floor, is_accessible as "isAccessible", created_at as "createdAt"',
      [input.spot_number, input.type, Number(input.price_rate), input.floor || 0, input.is_accessible || false]
    );
    return rows[0];
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT id, spot_number as "spotNumber", type, price_rate as "priceRate", floor, is_accessible as "isAccessible", created_at as "createdAt" FROM spots WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT id, spot_number as "spotNumber", type, price_rate as "priceRate", floor, is_accessible as "isAccessible", created_at as "createdAt" FROM spots ORDER BY spot_number'
    );
    return rows;
  }

  async findByType(type) {
    const { rows } = await this.pool.query(
      'SELECT id, spot_number as "spotNumber", type, price_rate as "priceRate", floor, is_accessible as "isAccessible", created_at as "createdAt" FROM spots WHERE type = $1 ORDER BY spot_number',
      [type]
    );
    return rows;
  }
}

module.exports = { SpotRepository };
