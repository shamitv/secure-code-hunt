import { Router } from "express";
import { DebugController } from "../controllers/DebugController";

export function createDebugRoutes(controller: DebugController) {
  const router = Router();
  router.get("/status", controller.status);
  return router;
}
