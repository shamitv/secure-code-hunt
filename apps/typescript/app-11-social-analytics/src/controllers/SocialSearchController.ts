import { Request, Response } from "express";
import { Client } from "@elastic/elasticsearch";
import { getEsClient, COMMENTS_INDEX } from "../config/elasticClient";

export class SocialSearchController {
  constructor(private readonly es: Client = getEsClient()) {}

  search = async (req: Request, res: Response) => {
    const q = String(req.query?.q ?? "");
    const result = await this.es.search({
      index: COMMENTS_INDEX,
      query: { match: { text: q } }
    });
    return res.json(result.hits.hits);
  };

  // Decoy: Parameterized term query — adjacent endpoint, safe pattern.
  searchByUser = async (req: Request, res: Response) => {
    const userId = Number(req.params?.userId ?? 0);
    const result = await this.es.search({
      index: COMMENTS_INDEX,
      query: { term: { user_id: userId } }
    });
    return res.json(result.hits.hits);
  };
}
