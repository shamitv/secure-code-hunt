const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
        device_secret VARCHAR(255) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_streams (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id),
        temperature NUMERIC(5,2),
        humidity NUMERIC(5,2),
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
      ON telemetry_streams(device_id, recorded_at)
    `);

    const userCount = await client.query('SELECT COUNT(*) AS cnt FROM users');
    if (parseInt(userCount.rows[0].cnt, 10) === 0) {
      const salt = bcrypt.genSaltSync(10);
      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['alice_owner', bcrypt.hashSync('alice123', salt), 'CUSTOMER']
      );
      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin_iot', bcrypt.hashSync('adminSecureIoT2026!', salt), 'ADMIN']
      );
    }

    const deviceCount = await client.query('SELECT COUNT(*) AS cnt FROM devices');
    if (parseInt(deviceCount.rows[0].cnt, 10) === 0) {
      await client.query(
        'INSERT INTO devices (name, status, device_secret) VALUES ($1, $2, $3)',
        ['Smart Thermostat', 'ONLINE', 'IOT-DEV-KEY-THERMO-1122']
      );
      await client.query(
        'INSERT INTO devices (name, status, device_secret) VALUES ($1, $2, $3)',
        ['Security Gateway', 'ONLINE', 'IOT-DEV-KEY-GATEWAY-8877']
      );
    }

    const telemetryCount = await client.query('SELECT COUNT(*) AS cnt FROM telemetry_streams');
    if (parseInt(telemetryCount.rows[0].cnt, 10) === 0) {
      for (let deviceId = 1; deviceId <= 2; deviceId++) {
        for (let i = 0; i < 5; i++) {
          const temp = (20 + Math.random() * 15).toFixed(2);
          const hum = (40 + Math.random() * 30).toFixed(2);
          const ts = new Date(Date.now() - i * 60000).toISOString();
          await client.query(
            'INSERT INTO telemetry_streams (device_id, temperature, humidity, recorded_at) VALUES ($1, $2, $3, $4)',
            [deviceId, temp, hum, ts]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Migration complete: users, devices, and telemetry_streams tables ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrate };
