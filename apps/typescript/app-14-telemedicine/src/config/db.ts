import { Pool } from "pg";
import { appConfig } from "./appConfig";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: appConfig.databaseUrl });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  return getPool().query(text, params);
}
