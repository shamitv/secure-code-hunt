import { Kafka, Producer } from "kafkajs";
import { appConfig } from "./appConfig";

let kafka: Kafka | null = null;
let producer: Producer | null = null;
export const SOCIAL_EVENTS_TOPIC = "social-events";

export function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: "social-analytics",
      brokers: appConfig.kafkaBrokers.split(",")
    });
  }
  return kafka;
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    const k = getKafka();
    producer = k.producer();
    await producer.connect();
    const admin = k.admin();
    await admin.createTopics({
      topics: [{ topic: SOCIAL_EVENTS_TOPIC, numPartitions: 1, replicationFactor: 1 }],
      waitForLeaders: true
    });
  }
  return producer;
}

export async function waitForKafka(): Promise<void> {
  const k = getKafka();
  const admin = k.admin();
  for (let i = 0; i < 30; i++) {
    try {
      await admin.listTopics();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Kafka did not become ready within timeout");
}
