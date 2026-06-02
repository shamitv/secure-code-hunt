import http from "http";
import { WebSocketServer } from "ws";
import { createApp } from "./app";
import { appConfig } from "./config/appConfig";
import { waitForDb, runMigrations } from "./config/db";
import { waitForRedis } from "./config/cache";
import { waitForKafka } from "./config/kafka";
import { waitForElasticsearch, createCommentsIndex } from "./config/elasticClient";
import { SyncManager } from "./services/SyncManager";
import { AnalyticsRepository } from "./repositories/AnalyticsRepository";
import { AnalyticsEventConsumer } from "./mq/AnalyticsEventConsumer";

async function main() {
  await waitForDb();
  await runMigrations();
  await waitForRedis();
  await waitForElasticsearch();
  await createCommentsIndex();
  await waitForKafka();

  const analyticsRepository = new AnalyticsRepository();
  const eventConsumer = new AnalyticsEventConsumer(analyticsRepository);
  await eventConsumer.start();

  const syncManager = new SyncManager();
  syncManager.start();

  const app = createApp(eventConsumer);
  const server = http.createServer(app);

  // VULNERABILITY A07: WebSocket accepts any connection without session verification.
  const wss = new WebSocketServer({ server, path: "/ws/live" });
  wss.on("connection", (ws) => {
    eventConsumer.wsClients.add(ws);
    ws.on("close", () => {
      eventConsumer.wsClients.delete(ws);
    });
  });

  server.listen(appConfig.port, () => {
    console.log(`Social analytics server listening on ${appConfig.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
