const { pool } = require('../config/db');

class TelemetryRepository {
  async findByDeviceId(deviceId) {
    const result = await pool.query(
      'SELECT * FROM telemetry_streams WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 100',
      [deviceId]
    );
    return result.rows;
  }

  async findByDeviceIdAndRange(deviceId, from, to) {
    const result = await pool.query(
      'SELECT * FROM telemetry_streams WHERE device_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC',
      [deviceId, from, to]
    );
    return result.rows;
  }

  // VULNERABILITY A03: Raw SQL filter string concatenated into telemetry SELECT query.
  async queryWithFilter(deviceId, rawFilter) {
    const query = `SELECT * FROM telemetry_streams WHERE device_id = ${deviceId} AND ${rawFilter} ORDER BY recorded_at DESC LIMIT 100`;
    const result = await pool.query(query);
    return result.rows;
  }

  async insertTelemetry(deviceId, temperature, humidity) {
    const result = await pool.query(
      'INSERT INTO telemetry_streams (device_id, temperature, humidity, recorded_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [deviceId, temperature, humidity]
    );
    return result.rows[0];
  }
}

module.exports = { TelemetryRepository };
