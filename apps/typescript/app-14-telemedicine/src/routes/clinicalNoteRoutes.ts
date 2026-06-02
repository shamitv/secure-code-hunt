import { Router } from "express";
import { ClinicalNoteController } from "../controllers/ClinicalNoteController";

export function createClinicalNoteRoutes(controller: ClinicalNoteController) {
  const router = Router();
  router.get("/:id", controller.getNote);
  router.post("/", controller.createNote);
  return router;
}
