import { Request, Response } from "express";
import { ConfigService } from "../services/ConfigService";

export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // VULNERABILITY A05: Unauthenticated environment dump returns raw process.env with credentials.
  getEnv = (_req: Request, res: Response) => {
    return res.json(this.configService.getEnv());
  };
}
