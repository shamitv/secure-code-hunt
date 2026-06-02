import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { User } from "../models/User";

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await this.pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) return undefined;
    return this.rowToUser(result.rows[0]);
  }

  async savePatient(username: string, password: string): Promise<User> {
    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const result = await this.pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'PATIENT') RETURNING *",
      [username, passwordHash]
    );
    return this.rowToUser(result.rows[0]);
  }

  private rowToUser(row: Record<string, unknown>): User {
    return {
      id: Number(row.id),
      username: String(row.username),
      passwordHash: String(row.password_hash),
      role: String(row.role) as User["role"]
    };
  }
}
