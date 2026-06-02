import { Kafka, Producer, Consumer } from "kafkajs";
import { appConfig } from "./appConfig";

let kafka: Kafka | null = null;
let producer: Producer | null = null;

const TOPICS = ["audit-events", "appointment-created", "prescription-created"];

export function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: "telemedicine",
      brokers: appConfig.kafkaBrokers.split(","),
      retry: { retries: 3 }
    });
  }
  return kafka;
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }
  return producer;
}

export function getConsumer(groupId: string): Consumer {
  return getKafka().consumer({ groupId });
}

export async function ensureTopics(): Promise<void> {
  const admin = getKafka().admin();
  await admin.connect();
  const existing = await admin.listTopics();
  const toCreate = TOPICS.filter((t) => !existing.includes(t));
  if (toCreate.length > 0) {
    await admin.createTopics({
      topics: toCreate.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 }))
    });
  }
  await admin.disconnect();
}
