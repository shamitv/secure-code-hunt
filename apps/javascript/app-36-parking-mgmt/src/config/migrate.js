const fs = require('fs');
const path = require('path');

async function runMigrations(pool) {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log(`[migration] applied ${file}`);
    } else if (file.endsWith('.js') && !file.includes('mongo-')) {
      const migrator = require(filePath);
      if (typeof migrator === 'function') {
        await migrator(pool);
        console.log(`[migration] applied ${file}`);
      }
    }
  }
}

module.exports = { runMigrations };
