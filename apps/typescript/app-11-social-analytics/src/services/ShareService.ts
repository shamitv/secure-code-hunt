import crypto from "crypto";
import { Pool } from "pg";
import { getPool } from "../config/db";

export class ShareService {
  // VULNERABILITY A02: XOR-encrypted sequential dashboard ID allows token enumeration.
  // CHAIN LINK 2 (chain-02): Predictable share tokens allow access to other users' dashboards.
  private readonly XOR_KEY = 0x4F;

  constructor(private readonly pool: Pool = getPool()) {}

  async generateToken(dashboardId: number, createdBy: number): Promise<string> {
    const encrypted = dashboardId ^ this.XOR_KEY;
    const token = Buffer.from(String(encrypted)).toString("base64");
    await this.pool.query(
      "INSERT INTO share_tokens (dashboard_id, token, created_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [dashboardId, token, createdBy]
    );
    return token;
  }

  async getDashboardByToken(token: string) {
    const decoded = Buffer.from(token, "base64").toString();
    const dashboardId = parseInt(decoded) ^ this.XOR_KEY;
    if (isNaN(dashboardId)) return null;
    const result = await this.pool.query("SELECT * FROM dashboards WHERE id = $1", [dashboardId]);
    return result.rows[0] || null;
  }

  // Decoy: Uses crypto.randomBytes for a different entity type.
  async generateShareLink(entityId: number, entityType: string): Promise<string> {
    const randomToken = crypto.randomBytes(32).toString("hex");
    return `${entityType}_${entityId}_${randomToken}`;
  }
}
