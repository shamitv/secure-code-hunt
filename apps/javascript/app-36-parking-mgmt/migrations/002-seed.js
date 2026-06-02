const bcrypt = require('bcryptjs');

module.exports = async function seed(pool) {
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0) return;

  const salt = bcrypt.genSaltSync(10);

  const users = [
    { username: 'alice_driver', passwordHash: bcrypt.hashSync('driver123', salt), role: 'CUSTOMER', licensePlate: 'ABC-123', contactEmail: 'alice@example.com' },
    { username: 'bob_driver', passwordHash: bcrypt.hashSync('driver456', salt), role: 'CUSTOMER', licensePlate: 'XYZ-789', contactEmail: 'bob@example.com' },
    { username: 'admin_attendant', passwordHash: bcrypt.hashSync('attendant2026Secure!', salt), role: 'ADMIN', licensePlate: 'ADM-001', contactEmail: 'admin@parking.com' }
  ];

  for (const u of users) {
    await pool.query(
      'INSERT INTO users (username, password_hash, role, license_plate, contact_email) VALUES ($1, $2, $3, $4, $5)',
      [u.username, u.passwordHash, u.role, u.licensePlate, u.contactEmail]
    );
  }

  const spotSeeds = [
    { spotNumber: 'A-101', type: 'Standard', priceRate: 5.0, floor: 0, isAccessible: true },
    { spotNumber: 'A-102', type: 'Standard', priceRate: 5.0, floor: 0, isAccessible: false },
    { spotNumber: 'B-201', type: 'Premium', priceRate: 12.0, floor: 1, isAccessible: true },
    { spotNumber: 'B-202', type: 'Premium', priceRate: 12.0, floor: 1, isAccessible: false }
  ];

  for (const s of spotSeeds) {
    await pool.query(
      'INSERT INTO spots (spot_number, type, price_rate, floor, is_accessible) VALUES ($1, $2, $3, $4, $5)',
      [s.spotNumber, s.type, s.priceRate, s.floor, s.isAccessible]
    );
  }

  const alice = await pool.query('SELECT id FROM users WHERE username = $1', ['alice_driver']);
  const spotA = await pool.query('SELECT id FROM spots WHERE spot_number = $1', ['A-101']);
  await pool.query(
    'INSERT INTO bookings (user_id, spot_id, duration_hours, total_cost, status) VALUES ($1, $2, $3, $4, $5)',
    [alice.rows[0].id, spotA.rows[0].id, 2, 10.0, 'ACTIVE']
  );
};
