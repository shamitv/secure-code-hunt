import { Router } from "express";
import { ShareController } from "../controllers/ShareController";

export function createShareRoutes(controller: ShareController) {
  const router = Router();
  router.get("/:id/share", controller.share);
  router.post("/shared/:token", controller.access);
  return router;
}
