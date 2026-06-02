import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { getPool } from "../config/db";

const SEED_PASSWORDS: Record<string, string> = {
  john_patient: "john_pass_123",
  jane_patient: "jane_pass_456",
  dr_house: "house_pass_789",
  admin: "admin_pass_2026"
};

async function runMigrations(pool: Pool) {
  const migrationDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationDir).sort();
  for (const file of files) {
    if (file.endsWith(".sql")) {
      const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
      await pool.query(sql);
      console.log(`Migration ${file} applied`);
    }
  }
}

async function runSeeds(pool: Pool) {
  const seedDir = path.join(__dirname, "seeds");
  if (!fs.existsSync(seedDir)) return;
  const files = fs.readdirSync(seedDir).sort();
  for (const file of files) {
    if (file.endsWith(".sql")) {
      const sql = fs.readFileSync(path.join(seedDir, file), "utf8");
      await pool.query(sql);
      console.log(`Seed ${file} applied`);
    }
  }

  for (const [username, password] of Object.entries(SEED_PASSWORDS)) {
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    await pool.query("UPDATE users SET password_hash = $1 WHERE username = $2", [hash, username]);
  }
  console.log("Seed password hashes updated");
}

export async function initializeDatabase() {
  const pool = getPool();
  await runMigrations(pool);
  await runSeeds(pool);
  console.log("Database initialized");
}
