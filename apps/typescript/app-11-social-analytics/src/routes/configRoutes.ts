import { Router } from "express";
import { ConfigController } from "../controllers/ConfigController";

export function createConfigRoutes(controller: ConfigController) {
  const router = Router();
  router.get("/env", controller.getEnv);
  return router;
}
