const { createConsumer } = require('../config/kafka');

class ValidatedConsumer {
  constructor(telemetryRepository) {
    this.telemetryRepository = telemetryRepository;
    this.consumer = createConsumer('iot-validated-group');
  }

  async start() {
    await this.consumer.subscribe({ topic: 'validated-telemetry', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const payload = JSON.parse(message.value.toString());
        // DECOY: Schema-validated consumer on a separate topic — safe deserialization.
        if (typeof payload.device_id !== 'number' || typeof payload.temperature !== 'number') {
          console.warn('ValidatedConsumer: invalid payload schema, discarding');
          return;
        }
        await this.telemetryRepository.insertTelemetry(
          payload.device_id,
          payload.temperature,
          payload.humidity || 0
        );
      }
    });

    console.log('ValidatedConsumer started');
  }

  async shutdown() {
    await this.consumer.disconnect();
  }
}

module.exports = { ValidatedConsumer };
