import { Producer } from "kafkajs";

export class AuditEventProducer {
  constructor(private readonly producer: Producer) {}

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify({ topic, ...payload }) }]
      });
    } catch (err) {
      console.error("Failed to publish audit event:", err);
    }
  }
}
