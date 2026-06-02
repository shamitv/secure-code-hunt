import { AppConfig } from "../config/appConfig";
import { Client } from "@elastic/elasticsearch";
import { Appointment } from "../models/Appointment";

export class PatientSearchClient {
  private readonly client: Client;

  constructor(private readonly config: AppConfig) {
    this.client = new Client({ node: config.patientSearchUrl });
  }

  indexAppointment(_appointment: Appointment) {
    return { target: this.config.patientSearchUrl, indexed: true };
  }

  // VULNERABILITY A03: Elasticsearch query DSL built with raw string concatenation.
  // VULNERABILITY A10: searchUrl parameter overrides target host for SSRF.
  // CHAIN LINK 2 (chain-03): searchUrl parameter overrides target host for SSRF.
  async searchPatients(query: string, searchUrl?: string): Promise<unknown> {
    const esClient = searchUrl ? new Client({ node: searchUrl }) : this.client;
    const body = JSON.parse(`{"query": {"match": {"notes": "${query}"}}}`);
    const result = await esClient.search({ index: "patient-notes", body });
    return result.hits.hits.map((h) => h._source);
  }

  // DECOY: Parameterized query using structured object.
  async searchPatientsStrict(query: string): Promise<unknown> {
    const result = await this.client.search({
      index: "patient-notes",
      body: { query: { match: { notes: query } } }
    });
    return result.hits.hits.map((h) => h._source);
  }

  // DECOY: Hostname allowlist before fetch.
  async fetchMetadata(url: string): Promise<{ allowed: boolean }> {
    const parsed = new URL(url);
    if (!["localhost", "elasticsearch"].includes(parsed.hostname)) {
      throw new Error("Blocked hostname");
    }
    return { allowed: true };
  }
}
