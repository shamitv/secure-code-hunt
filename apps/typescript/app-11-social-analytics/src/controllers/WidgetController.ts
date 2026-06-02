import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { WidgetService } from "../services/WidgetService";

export class WidgetController {
  constructor(
    private readonly widgetService: WidgetService,
    private readonly authService: AuthService
  ) {}

  list = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    return res.json(await this.widgetService.listWidgets(user?.id ?? 1));
  };

  // CHAIN LINK 1 (chain-02): Widget config accepted without whitelist, allowing malicious payload injection.
  create = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const widget = await this.widgetService.createWidget(user?.id ?? 1, {
      title: String(req.body?.title ?? "Untitled"),
      type: String(req.body?.type ?? "metric"),
      value: String(req.body?.value ?? "0"),
      config: req.body?.config
    });
    return res.status(201).json(widget);
  };

  // Decoy: updateWidget validates config against a whitelist.
  update = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    const id = Number(req.params?.id ?? 0);
    const widget = await this.widgetService.updateWidgetConfig(id, user?.id ?? 0, req.body?.config ?? {});
    return widget ? res.json(widget) : res.status(404).json({ error: "Not found" });
  };
}
