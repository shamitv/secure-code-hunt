import { Pool } from "pg";
import { getPool } from "../config/db";

export class UserRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async findByUsername(username: string) {
    const result = await this.pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0] || null;
  }

  async findById(id: number) {
    const result = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] || null;
  }
}
