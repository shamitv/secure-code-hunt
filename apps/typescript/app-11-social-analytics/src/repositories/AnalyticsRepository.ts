import { Pool } from "pg";
import { getPool } from "../config/db";

export class AnalyticsRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async insertEvent(widgetId: number, eventType: string, payload: Record<string, unknown>) {
    const result = await this.pool.query(
      "INSERT INTO analytics_events (widget_id, event_type, payload) VALUES ($1, $2, $3) RETURNING *",
      [widgetId, eventType, JSON.stringify(payload)]
    );
    return result.rows[0];
  }

  async getEventsByWidget(widgetId: number) {
    const result = await this.pool.query(
      "SELECT * FROM analytics_events WHERE widget_id = $1 ORDER BY created_at DESC",
      [widgetId]
    );
    return result.rows;
  }

  async getRecentEvents(limit: number = 50) {
    const result = await this.pool.query(
      "SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return result.rows;
  }
}
