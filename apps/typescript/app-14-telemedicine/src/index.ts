import { createApp } from "./app";
import { appConfig } from "./config/appConfig";
import { initializeDatabase } from "./db/migrate";

async function main() {
  await initializeDatabase();

  const { app, ctx } = await createApp();

  ctx.prescriptionConsumer.start().catch((err) => console.error("PrescriptionConsumer error:", err));
  ctx.notificationConsumer.start().catch((err) => console.error("NotificationConsumer error:", err));

  app.listen(appConfig.port, () => {
    console.log(`Telemedicine app listening on ${appConfig.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
