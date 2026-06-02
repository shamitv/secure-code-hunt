import { Producer } from "kafkajs";
import { getProducer, SOCIAL_EVENTS_TOPIC } from "../config/kafka";

export class AnalyticsEventProducer {
  private producer: Producer | null = null;

  async publish(eventType: string, payload: Record<string, unknown>) {
    if (!this.producer) {
      this.producer = await getProducer();
    }
    await this.producer.send({
      topic: SOCIAL_EVENTS_TOPIC,
      messages: [{ value: JSON.stringify({ ...payload, event_type: eventType, timestamp: new Date().toISOString() }) }]
    });
  }
}
