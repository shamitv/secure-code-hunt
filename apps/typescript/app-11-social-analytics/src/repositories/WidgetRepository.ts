import { Pool } from "pg";
import { getPool } from "../config/db";

export class WidgetRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async findByUserId(userId: number) {
    const result = await this.pool.query("SELECT * FROM widgets WHERE user_id = $1", [userId]);
    return result.rows;
  }

  async save(widget: { userId: number; title: string; type: string; value: string; config?: Record<string, unknown> }) {
    const result = await this.pool.query(
      "INSERT INTO widgets (user_id, title, type, value, config) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [widget.userId, widget.title, widget.type, widget.value, widget.config ? JSON.stringify(widget.config) : "{}"]
    );
    return result.rows[0];
  }

  async update(id: number, userId: number, updates: Record<string, unknown>) {
    const result = await this.pool.query(
      "UPDATE widgets SET config = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(updates), id, userId]
    );
    return result.rows[0] || null;
  }
}
