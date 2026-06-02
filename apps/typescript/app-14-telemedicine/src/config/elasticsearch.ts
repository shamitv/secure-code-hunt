import { Client } from "@elastic/elasticsearch";
import { appConfig } from "./appConfig";

let client: Client | null = null;

export function getElasticsearch(): Client {
  if (!client) {
    client = new Client({ node: appConfig.patientSearchUrl });
  }
  return client;
}
