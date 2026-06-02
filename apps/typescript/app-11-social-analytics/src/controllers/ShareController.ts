import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { ShareService } from "../services/ShareService";

export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly authService: AuthService
  ) {}

  share = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const dashboardId = Number(req.params?.id ?? 0);
    const token = await this.shareService.generateToken(dashboardId, user?.id ?? 0);
    return res.json({ token });
  };

  access = async (req: Request, res: Response) => {
    const token = String(req.params?.token ?? "");
    const dashboard = await this.shareService.getDashboardByToken(token);
    return dashboard ? res.json(dashboard) : res.status(404).json({ error: "Not found" });
  };
}
