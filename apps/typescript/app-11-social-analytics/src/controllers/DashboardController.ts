import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { DashboardRepository } from "../repositories/DashboardRepository";

export class DashboardController {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly authService: AuthService
  ) {}

  list = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const dashboards = await this.dashboardRepository.findByUserId(user?.id ?? 1);
    return res.json(dashboards);
  };

  create = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const dashboard = await this.dashboardRepository.create(
      user?.id ?? 1,
      String(req.body?.name ?? "Untitled"),
      JSON.stringify(req.body?.layout ?? [])
    );
    return res.status(201).json(dashboard);
  };

  search = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const query = String(req.query?.q ?? "");
    const dashboards = await this.dashboardRepository.search(user?.id ?? 1, query);
    return res.json(dashboards);
  };
}
