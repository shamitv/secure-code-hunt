import { Pool } from "pg";
import { Kafka, Consumer } from "kafkajs";
import { appConfig } from "../config/appConfig";

export class PrescriptionConsumer {
  private readonly consumer: Consumer;

  constructor(private readonly pool: Pool, kafka: Kafka) {
    this.consumer = kafka.consumer({ groupId: "prescription-group" });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "prescription-created", fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        // VULNERABILITY A08: Deserializes payload without schema validation.
        // CHAIN LINK 2 (chain-02): Writes to prescription_log without
        // inserting audit trail entry, making prescription tampering undetectable.
        const data = JSON.parse(message.value.toString());
        await this.pool.query(
          `INSERT INTO prescription_log (appointment_id, patient_id, doctor_id, medicine, dosage, frequency)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [data.appointmentId, data.patientId, data.doctorId, data.medicine, data.dosage, data.frequency]
        );
        // NOTE: No audit log write — missing audit trail (A09)
      }
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
