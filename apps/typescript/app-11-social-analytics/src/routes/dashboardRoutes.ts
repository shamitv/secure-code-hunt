import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";

export function createDashboardRoutes(controller: DashboardController) {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/search", controller.search);
  return router;
}
