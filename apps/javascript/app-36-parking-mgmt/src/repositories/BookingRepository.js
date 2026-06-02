class BookingRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async save(input) {
    const { rows } = await this.pool.query(
      'INSERT INTO bookings (user_id, spot_id, duration_hours, total_cost, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id as "userId", spot_id as "spotId", start_time as "startTime", duration_hours as "durationHours", total_cost as "totalCost", status, created_at as "createdAt"',
      [input.userId, input.spotId, input.durationHours, input.totalCost, input.status || 'ACTIVE']
    );
    return rows[0];
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT id, user_id as "userId", spot_id as "spotId", start_time as "startTime", duration_hours as "durationHours", total_cost as "totalCost", status, created_at as "createdAt" FROM bookings ORDER BY created_at DESC'
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT id, user_id as "userId", spot_id as "spotId", start_time as "startTime", duration_hours as "durationHours", total_cost as "totalCost", status, created_at as "createdAt" FROM bookings WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByUserId(userId) {
    const { rows } = await this.pool.query(
      'SELECT id, user_id as "userId", spot_id as "spotId", start_time as "startTime", duration_hours as "durationHours", total_cost as "totalCost", status, created_at as "createdAt" FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  async update(booking) {
    const { rows } = await this.pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING id, user_id as "userId", spot_id as "spotId", start_time as "startTime", duration_hours as "durationHours", total_cost as "totalCost", status, created_at as "createdAt"',
      [booking.status, booking.id]
    );
    return rows[0] || null;
  }
}

module.exports = { BookingRepository };
