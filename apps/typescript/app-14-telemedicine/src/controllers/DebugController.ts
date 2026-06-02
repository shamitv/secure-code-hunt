import { Request, Response } from "express";
import { appConfig } from "../config/appConfig";

export class DebugController {
  // VULNERABILITY A05: Unauthenticated endpoint exposes internal service topology.
  // CHAIN LINK 1 (chain-03): Leaked URLs enable SSRF pivot to internal services.
  status = (_req: Request, res: Response) => {
    return res.json({
      postgres: appConfig.databaseUrl,
      redis: appConfig.redisUrl,
      kafka: appConfig.kafkaBrokers,
      elasticsearch: appConfig.patientSearchUrl,
      mongodb: appConfig.mongoUri
    });
  };
}
