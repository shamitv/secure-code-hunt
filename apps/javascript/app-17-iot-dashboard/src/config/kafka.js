const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'iot-dashboard',
  brokers
});

const producer = kafka.producer({ allowAutoTopicCreation: true });

function createConsumer(groupId) {
  return kafka.consumer({ groupId });
}

async function connectProducer() {
  await producer.connect();
  console.log('Kafka producer connected');
}

async function disconnectProducer() {
  await producer.disconnect();
  console.log('Kafka producer disconnected');
}

module.exports = { kafka, producer, createConsumer, connectProducer, disconnectProducer };
