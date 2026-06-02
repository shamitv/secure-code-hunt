import { Kafka, Consumer } from "kafkajs";

export class NotificationConsumer {
  private readonly consumer: Consumer;

  constructor(kafka: Kafka) {
    this.consumer = kafka.consumer({ groupId: "notification-group" });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "appointment-created", fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        // DECOY: Validates payload schema and logs all operations.
        try {
          const data = JSON.parse(message.value.toString());
          if (!data.appointmentId || !data.patientId) {
            console.warn("Notification: invalid payload — rejected");
            return;
          }
          console.log(`Notification: appointment ${data.appointmentId} created for patient ${data.patientId}`);
        } catch {
          console.warn("Notification: unparseable message — rejected");
        }
      }
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
