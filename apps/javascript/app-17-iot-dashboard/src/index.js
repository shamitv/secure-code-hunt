const http = require('http');
const path = require('path');
const { createApp } = require('./app');
const { appConfig } = require('./config/appConfig');
const { migrate } = require('./config/migrate');
const { producer, connectProducer, disconnectProducer, createConsumer } = require('./config/kafka');
const { esClient, ensureIndex } = require('./config/elasticsearch');
const { TelemetryRepository } = require('./repositories/TelemetryRepository');
const { TelemetryConsumer } = require('./consumers/TelemetryConsumer');
const { ValidatedConsumer } = require('./consumers/ValidatedConsumer');
const { TelemetryWsServer } = require('./ws/telemetryServer');

let telemetryConsumer;
let validatedConsumer;
let wsServer;

async function main() {
  try {
    await migrate();
  } catch (err) {
    console.warn('Migration skipped or DB unavailable:', err.message);
  }

  let kafkaProducer;
  let esClientInstance;
  let consumersStarted = false;

  try {
    await connectProducer();
    kafkaProducer = producer;
  } catch (err) {
    console.warn('Kafka connection failed, using in-process events:', err.message);
  }

  try {
    await ensureIndex();
    esClientInstance = esClient;
  } catch (err) {
    console.warn('Elasticsearch connection failed, search stubs active:', err.message);
  }

  const app = createApp({ kafkaProducer, esClient: esClientInstance });
  const httpServer = http.createServer(app);

  wsServer = new TelemetryWsServer(httpServer);

  httpServer.listen(appConfig.port, async () => {
    console.log(`IoT Device Dashboard listening at http://localhost:${appConfig.port}`);

    if (kafkaProducer && esClientInstance) {
      try {
        const kafkaConsumer = createConsumer('iot-dashboard-group');
        const telemetryRepo = new TelemetryRepository();
        telemetryConsumer = new TelemetryConsumer(kafkaConsumer, telemetryRepo, esClientInstance, wsServer);
        await telemetryConsumer.start();

        validatedConsumer = new ValidatedConsumer(telemetryRepo);
        await validatedConsumer.start();

        consumersStarted = true;
        console.log('Telemetry and validated consumers started');
      } catch (err) {
        console.warn('Consumer startup failed:', err.message);
      }
    }
  });

  function shutdown(signal) {
    return async () => {
      console.log(`Received ${signal}, shutting down...`);
      if (telemetryConsumer) await telemetryConsumer.shutdown();
      if (validatedConsumer) await validatedConsumer.shutdown();
      if (wsServer) wsServer.close();
      await disconnectProducer();
      httpServer.close(() => process.exit(0));
    };
  }

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

main();
