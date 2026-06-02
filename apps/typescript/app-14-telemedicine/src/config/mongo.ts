import { MongoClient, Db, Collection } from "mongodb";
import { appConfig } from "./appConfig";
import { ClinicalNote } from "../models/ClinicalNote";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(appConfig.mongoUri);
    await client.connect();
  }
  return client;
}

export async function getClinicalNotesCollection(): Promise<Collection<ClinicalNote>> {
  if (!db) {
    const c = await getMongoClient();
    db = c.db("telemed_clinical");
  }
  return db.collection<ClinicalNote>("clinical_notes");
}
