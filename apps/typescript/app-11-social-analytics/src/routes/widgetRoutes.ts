import { Router } from "express";
import { WidgetController } from "../controllers/WidgetController";

export function createWidgetRoutes(controller: WidgetController) {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.put("/:id/config", controller.update);
  return router;
}
