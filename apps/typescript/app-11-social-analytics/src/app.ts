import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { appConfig } from "./config/appConfig";
import { SessionCache } from "./cache/SessionCache";
import { UserRepository } from "./repositories/UserRepository";
import { WidgetRepository } from "./repositories/WidgetRepository";
import { DashboardRepository } from "./repositories/DashboardRepository";
import { AnalyticsRepository } from "./repositories/AnalyticsRepository";
import { AnalyticsEventConsumer } from "./mq/AnalyticsEventConsumer";
import { AnalyticsEventProducer } from "./mq/AnalyticsEventProducer";
import { InternalSearchClient } from "./search/InternalSearchClient";
import { AuthService } from "./services/AuthService";
import { ConfigService } from "./services/ConfigService";
import { DebugService } from "./services/DebugService";
import { InternalSearchService } from "./services/InternalSearchService";
import { PreviewService } from "./services/PreviewService";
import { ShareService } from "./services/ShareService";
import { WidgetService } from "./services/WidgetService";
import { AuthController } from "./controllers/AuthController";
import { ConfigController } from "./controllers/ConfigController";
import { DashboardController } from "./controllers/DashboardController";
import { DebugController } from "./controllers/DebugController";
import { HealthController } from "./controllers/HealthController";
import { InternalSearchController } from "./controllers/InternalSearchController";
import { MetricsController } from "./controllers/MetricsController";
import { PreviewController } from "./controllers/PreviewController";
import { ShareController } from "./controllers/ShareController";
import { SocialSearchController } from "./controllers/SocialSearchController";
import { WidgetController } from "./controllers/WidgetController";
import { createAuthRoutes } from "./routes/authRoutes";
import { createConfigRoutes } from "./routes/configRoutes";
import { createDashboardRoutes } from "./routes/dashboardRoutes";
import { createDebugRoutes } from "./routes/debugRoutes";
import { createHealthRoutes } from "./routes/healthRoutes";
import { createInternalRoutes } from "./routes/internalRoutes";
import { createMetricsRoutes } from "./routes/metricsRoutes";
import { createPreviewRoutes } from "./routes/previewRoutes";
import { createSearchRoutes } from "./routes/searchRoutes";
import { createShareRoutes } from "./routes/shareRoutes";
import { createWidgetRoutes } from "./routes/widgetRoutes";

export function createApp(consumer?: AnalyticsEventConsumer) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, "..", "public")));

  const sessionCache = new SessionCache();
  const userRepository = new UserRepository();
  const widgetRepository = new WidgetRepository();
  const dashboardRepository = new DashboardRepository();
  const analyticsRepository = new AnalyticsRepository();
  const eventConsumer = consumer ?? new AnalyticsEventConsumer();
  const eventProducer = new AnalyticsEventProducer();
  const internalSearchClient = new InternalSearchClient(appConfig);

  const authService = new AuthService(userRepository, sessionCache, eventProducer);
  const configService = new ConfigService();
  const shareService = new ShareService();
  const widgetService = new WidgetService(widgetRepository, eventProducer);
  const previewService = new PreviewService();
  const debugService = new DebugService(appConfig);
  const internalSearchService = new InternalSearchService(internalSearchClient);

  app.use("/api/auth", createAuthRoutes(new AuthController(authService)));
  app.use("/api/config", createConfigRoutes(new ConfigController(configService)));
  app.use("/api/dashboards", createDashboardRoutes(new DashboardController(dashboardRepository, authService)));
  app.use("/api/dashboards", createShareRoutes(new ShareController(shareService, authService)));
  app.use("/api/widgets", createWidgetRoutes(new WidgetController(widgetService, authService)));
  app.use("/api/metrics", createMetricsRoutes(new MetricsController(eventProducer)));
  app.use("/api/preview", createPreviewRoutes(new PreviewController(previewService)));
  app.use("/api/search", createSearchRoutes(new SocialSearchController()));
  app.use("/api/debug", createDebugRoutes(new DebugController(debugService)));
  app.use("/api/health", createHealthRoutes(new HealthController()));
  app.use("/internal/search", createInternalRoutes(new InternalSearchController(internalSearchService)));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  app.get("/dashboard", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
  });

  return app;
}
