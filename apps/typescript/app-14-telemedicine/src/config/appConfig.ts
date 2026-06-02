export interface AppConfig {
  port: number;
  jwtSecret: string;
  databaseUrl: string;
  redisUrl: string;
  kafkaBrokers: string;
  patientSearchUrl: string;
  mongoUri: string;
}

export const appConfig: AppConfig = {
  port: Number(process.env.PORT ?? 8014),
  // VULNERABILITY A02: JWT signing secret is hardcoded and weak.
  jwtSecret: process.env.JWT_SECRET ?? "healthcare123",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://telemed:telemedpass@localhost:5432/telemeddb",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/14",
  kafkaBrokers: process.env.KAFKA_BROKERS ?? "localhost:9092",
  patientSearchUrl: process.env.PATIENT_SEARCH_URL ?? "http://localhost:9200",
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/telemed_clinical"
};
