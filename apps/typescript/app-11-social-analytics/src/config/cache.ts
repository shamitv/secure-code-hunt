import { createClient, RedisClientType } from "redis";
import { appConfig } from "./appConfig";

let client: RedisClientType | null = null;

export function getCache(): RedisClientType {
  if (!client) {
    client = createClient({ url: appConfig.redisUrl });
  }
  return client;
}

export async function waitForRedis(): Promise<void> {
  const c = getCache();
  for (let i = 0; i < 30; i++) {
    try {
      await c.connect();
      await c.ping();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Redis did not become ready within timeout");
}
