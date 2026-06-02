import { Router } from "express";
import { MetricsController } from "../controllers/MetricsController";

export function createMetricsRoutes(controller: MetricsController) {
  const router = Router();
  router.post("/ingest", controller.ingest);
  return router;
}
