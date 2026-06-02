import { Client } from "@elastic/elasticsearch";
import { appConfig } from "./appConfig";

let client: Client | null = null;
const COMMENTS_INDEX = "social_comments";

const commentsMapping = {
  mappings: {
    properties: {
      id: { type: "integer" },
      widget_id: { type: "integer" },
      user_id: { type: "integer" },
      text: { type: "text", analyzer: "standard" },
      sentiment: { type: "keyword" },
      timestamp: { type: "date" }
    }
  }
};

export function getEsClient(): Client {
  if (!client) {
    client = new Client({ node: appConfig.elasticsearchUrl });
  }
  return client;
}

export async function waitForElasticsearch(): Promise<void> {
  const c = getEsClient();
  for (let i = 0; i < 30; i++) {
    try {
      const health = await c.cluster.health();
      if (health.status === "yellow" || health.status === "green") {
        return;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Elasticsearch did not become ready within timeout");
}

export async function createCommentsIndex(): Promise<void> {
  try {
    await getEsClient().indices.create({
      index: COMMENTS_INDEX,
      ...commentsMapping
    });
  } catch {
    // index may already exist
  }
}

export { COMMENTS_INDEX };
