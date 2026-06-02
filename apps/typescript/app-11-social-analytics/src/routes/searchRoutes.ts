import { Router } from "express";
import { SocialSearchController } from "../controllers/SocialSearchController";

export function createSearchRoutes(controller: SocialSearchController) {
  const router = Router();
  router.get("/feed", controller.search);
  router.get("/user/:userId", controller.searchByUser);
  return router;
}
