import { Pool } from "pg";
import { getPool } from "../config/db";

export class DashboardRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  // VULNERABILITY A03: Raw string interpolation in SQL query allows SQL injection.
  async search(userId: number, query: string) {
    const result = await this.pool.query(
      `SELECT * FROM dashboards WHERE user_id = ${userId} AND name ILIKE '%${query}%'`
    );
    return result.rows;
  }

  async findByUserId(userId: number) {
    const result = await this.pool.query("SELECT * FROM dashboards WHERE user_id = $1", [userId]);
    return result.rows;
  }

  async findById(id: number) {
    const result = await this.pool.query("SELECT * FROM dashboards WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async create(userId: number, name: string, layout: string) {
    const result = await this.pool.query(
      "INSERT INTO dashboards (user_id, name, layout) VALUES ($1, $2, $3) RETURNING *",
      [userId, name, layout]
    );
    return result.rows[0];
  }
}
