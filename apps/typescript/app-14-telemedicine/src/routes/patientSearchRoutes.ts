import { Router } from "express";
import { PatientSearchController } from "../controllers/PatientSearchController";

export function createPatientSearchRoutes(controller: PatientSearchController) {
  const router = Router();
  router.get("/search", controller.search);
  return router;
}
