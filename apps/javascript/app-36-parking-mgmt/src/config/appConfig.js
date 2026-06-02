const appConfig = {
  port: Number(process.env.PORT || 8036),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://parking:parkingpass@postgres:5432/parkingdb',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379/36',
  mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/parkingdb',
  kafkaBrokers: process.env.KAFKA_BROKERS || 'kafka:9092',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  // CHAIN LINK 1 (chain-03): Hardcoded JWT secret enables offline token forgery.
  // VULNERABILITY A02: Hardcoded JWT secret allows offline token forgery.
  jwtSecret: 'parking-mgmt-secret-key-2024',
  jwtExpiry: '24h'
};

module.exports = { appConfig };
