import { Request, Response } from "express";
import { PatientSearchClient } from "../search/PatientSearchClient";
import { AuthService } from "../services/AuthService";

export class PatientSearchController {
  constructor(
    private readonly patientSearchClient: PatientSearchClient,
    private readonly authService: AuthService
  ) {}

  search = async (req: Request, res: Response) => {
    const user = await this.authService.requireUser(req.cookies?.token);
    if (!user) {
      return res.status(401).json({ message: "Access denied." });
    }

    const q = String(req.query.q ?? "");
    const searchUrl = req.query.search_url ? String(req.query.search_url) : undefined;
    try {
      const results = await this.patientSearchClient.searchPatients(q, searchUrl);
      return res.json({ results, query: q });
    } catch (err) {
      return res.status(500).json({ message: "Search failed", error: String(err) });
    }
  };
}
