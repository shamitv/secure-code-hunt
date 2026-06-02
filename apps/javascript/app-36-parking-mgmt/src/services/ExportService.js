// CHAIN LINK 3 (chain-03): Export endpoint joins PostgreSQL and MongoDB without resource-ownership check.
class ExportService {
  constructor(pool, mongoDb) {
    this.pool = pool;
    this.mongoDb = mongoDb;
  }

  async exportBookingReport(bookingIds) {
    const { rows } = await this.pool.query(
      `SELECT b.id, b.user_id as "userId", b.spot_id as "spotId", b.duration_hours as "durationHours",
              b.total_cost as "totalCost", b.status, u.username, u.license_plate as "licensePlate",
              u.contact_email as "contactEmail"
       FROM bookings b JOIN users u ON b.user_id = u.id
       WHERE b.id = ANY($1::int[])`,
      [bookingIds]
    );

    const enriched = [];
    for (const row of rows) {
      const profile = await this.mongoDb.collection('user_profiles').findOne({ userId: row.userId });
      enriched.push({ ...row, mongoProfile: profile || null });
    }
    return enriched;
  }
}

module.exports = { ExportService };
