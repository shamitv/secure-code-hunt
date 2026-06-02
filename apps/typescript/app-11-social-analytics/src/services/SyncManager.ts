import { Pool } from "pg";
import { Client } from "@elastic/elasticsearch";
import { getPool } from "../config/db";
import { getEsClient, COMMENTS_INDEX } from "../config/elasticClient";

export class SyncManager {
  private lastSyncedId = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly pool: Pool = getPool(),
    private readonly es: Client = getEsClient(),
    private readonly intervalMs: number = 30000
  ) {}

  start() {
    this.timer = setInterval(() => this.sync(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private async sync() {
    try {
      const result = await this.pool.query(
        "SELECT * FROM analytics_events WHERE event_type = 'comment' AND id > $1 ORDER BY id ASC",
        [this.lastSyncedId]
      );
      for (const row of result.rows) {
        await this.es.index({
          index: COMMENTS_INDEX,
          body: {
            id: row.id,
            widget_id: row.widget_id,
            user_id: row.user_id,
            text: row.payload?.text ?? "",
            sentiment: row.payload?.sentiment ?? "neutral",
            timestamp: row.created_at
          }
        });
        this.lastSyncedId = row.id;
      }
    } catch {
      // ES or PG may not be ready yet
    }
  }
}
