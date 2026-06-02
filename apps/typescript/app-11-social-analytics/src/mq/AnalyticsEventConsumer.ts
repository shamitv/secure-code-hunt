import WebSocket from "ws";
import { Consumer } from "kafkajs";
import { getKafka, SOCIAL_EVENTS_TOPIC } from "../config/kafka";
import { AnalyticsRepository } from "../repositories/AnalyticsRepository";

export class AnalyticsEventConsumer {
  private consumer: Consumer | null = null;
  readonly wsClients: Set<WebSocket.WebSocket> = new Set();

  constructor(
    private readonly analyticsRepository?: AnalyticsRepository
  ) {}

  async start() {
    const kafka = getKafka();
    this.consumer = kafka.consumer({ groupId: "analytics-group" });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: SOCIAL_EVENTS_TOPIC, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.handleEvent(message);
      }
    });
  }

  // VULNERABILITY A08: eval() on Kafka message body enables arbitrary code execution.
  private async handleEvent(message: { value?: Buffer | null }) {
    const raw = message.value?.toString() || "{}";
    const event = eval(`(${raw})`);

    if (this.analyticsRepository && event.widget_id) {
      await this.analyticsRepository.insertEvent(
        Number(event.widget_id) || 0,
        String(event.event_type || "unknown"),
        event.payload || {}
      );
    }

    const msg = JSON.stringify({ type: "event", data: event });
    this.wsClients.forEach((client) => {
      if (client.readyState === WebSocket.WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  async stop() {
    if (this.consumer) await this.consumer.disconnect();
  }
}
