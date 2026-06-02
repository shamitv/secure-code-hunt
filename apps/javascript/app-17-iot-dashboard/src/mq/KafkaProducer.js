class KafkaProducer {
  constructor(kafkaProducer) {
    this.producer = kafkaProducer;
  }

  async publish(topic, payload) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
  }
}

module.exports = { KafkaProducer };
