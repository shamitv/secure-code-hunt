import { Router } from "express";
import { AppointmentController } from "../controllers/AppointmentController";

export function createAppointmentRoutes(controller: AppointmentController) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.detail);
  router.post("/", controller.book);
  return router;
}
