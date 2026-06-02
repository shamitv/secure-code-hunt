const { Kafka } = require('kafkajs');

let kafka = null;
let producer = null;

function getKafka(brokers) {
  if (!kafka) {
    kafka = new Kafka({
      clientId: 'parking-mgmt',
      brokers: brokers.split(',')
    });
  }
  return kafka;
}

async function getProducer(brokers) {
  if (!producer) {
    const k = getKafka(brokers);
    producer = k.producer();
    await producer.connect();
  }
  return producer;
}

async function getConsumer(brokers, groupId) {
  const k = getKafka(brokers);
  const consumer = k.consumer({ groupId });
  await consumer.connect();
  return consumer;
}

module.exports = { getKafka, getProducer, getConsumer };
