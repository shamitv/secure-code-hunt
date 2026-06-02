import { Request, Response } from "express";
import { getPool } from "../config/db";
import { getCache } from "../config/cache";

export class HealthController {
  health = async (_req: Request, res: Response) => {
    let pgStatus = "disconnected";
    let redisStatus = "disconnected";
    try {
      await getPool().query("SELECT 1");
      pgStatus = "connected";
    } catch { /* not ready */ }
    try {
      await getCache().ping();
      redisStatus = "connected";
    } catch { /* not ready */ }
    return res.json({ status: "ok", postgres: pgStatus, redis: redisStatus });
  };
}
