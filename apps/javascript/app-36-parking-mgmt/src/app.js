const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { appConfig } = require('./config/appConfig');
const { getPool } = require('./config/postgres');
const { runMigrations } = require('./config/migrate');
const { getRedisClient } = require('./config/redis');
const { getMongoDb } = require('./config/mongo');
const { getProducer, getConsumer } = require('./config/kafka');
const { getEsClient, ensureEsIndex } = require('./config/elastic');
const { SessionCache } = require('./cache/SessionCache');
const { AuthController } = require('./controllers/AuthController');
const { AdminController } = require('./controllers/AdminController');
const { BookingController } = require('./controllers/BookingController');
const { ExportController } = require('./controllers/ExportController');
const { HealthController } = require('./controllers/HealthController');
const { SpotController } = require('./controllers/SpotController');
const { BookingConsumer } = require('./consumers/BookingConsumer');
const { JwtAuthMiddleware } = require('./middleware/jwtAuth');
const { AdminOnlyMiddleware } = require('./middleware/adminOnly');
const { EventConsumer } = require('./mq/EventConsumer');
const { EventProducer } = require('./mq/EventProducer');
const { BookingProducer } = require('./producers/BookingProducer');
const { BookingRepository } = require('./repositories/BookingRepository');
const { SpotRepository } = require('./repositories/SpotRepository');
const { UserRepository } = require('./repositories/UserRepository');
const { ParkingSearchClient } = require('./search/ParkingSearchClient');
const { AuthService } = require('./services/AuthService');
const { BookingService } = require('./services/BookingService');
const { DynamicPricing } = require('./services/DynamicPricing');
const { ExportService } = require('./services/ExportService');
const { LotLayoutService } = require('./services/LotLayoutService');
const { SpotPhotoService } = require('./services/SpotPhotoService');
const { SpotService } = require('./services/SpotService');
const { createAuthRoutes } = require('./routes/authRoutes');
const { createAdminRoutes } = require('./routes/adminRoutes');
const { createBookingRoutes } = require('./routes/bookingRoutes');
const { createExportRoutes } = require('./routes/exportRoutes');
const { createHealthRoutes } = require('./routes/healthRoutes');
const { createSpotRoutes } = require('./routes/spotRoutes');
const setupMongo = require('../migrations/003-mongo-setup.mongo');
const seedUserProfiles = require('../migrations/004-mongo-user-profiles.mongo');

async function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const pool = getPool(appConfig.databaseUrl);
  await runMigrations(pool);

  const redisClient = getRedisClient(appConfig.redisUrl);
  const mongoDb = await getMongoDb(appConfig.mongoUri);
  await setupMongo(mongoDb);
  await seedUserProfiles(mongoDb);

  const esClient = getEsClient(appConfig.elasticsearchUrl);
  await ensureEsIndex(esClient, pool).catch((err) => console.error('ES index setup error:', err.message));

  const kafkaProducer = await getProducer(appConfig.kafkaBrokers);
  const kafkaConsumer = await getConsumer(appConfig.kafkaBrokers, 'booking-processor');

  const sessions = new SessionCache(redisClient);
  const events = new EventProducer(new EventConsumer());
  const users = new UserRepository(pool);
  const spots = new SpotRepository(pool);
  const bookings = new BookingRepository(pool);
  const searchClient = new ParkingSearchClient(appConfig, spots, esClient);
  const authService = new AuthService(users, sessions, events);
  const spotService = new SpotService(spots, searchClient, events);
  const bookingService = new BookingService(bookings, spots, events);
  const lotLayoutService = new LotLayoutService();
  const spotPhotoService = new SpotPhotoService();
  const bookingProducer = new BookingProducer(kafkaProducer);
  const bookingConsumer = new BookingConsumer(pool);
  const exportService = new ExportService(pool, mongoDb);
  const dynamicPricing = new DynamicPricing(pool, mongoDb);

  bookingConsumer.start(kafkaConsumer).catch((err) => console.error('Consumer start error:', err.message));

  const jwtAuth = new JwtAuthMiddleware();
  const adminOnly = new AdminOnlyMiddleware();
  const spotController = new SpotController(authService, spotService, lotLayoutService, mongoDb, spotPhotoService);
  const bookingController = new BookingController(authService, bookingService, bookingProducer);
  const adminController = new AdminController(pool, mongoDb);
  const exportController = new ExportController(exportService);

  app.use('/api/auth', createAuthRoutes(new AuthController(authService, pool)));
  app.use('/api/admin', createAdminRoutes(adminController, spotController));
  app.use('/api/spots', createSpotRoutes(spotController));
  app.use('/api/bookings', createBookingRoutes(bookingController));
  app.use('/api/admin/exports', createExportRoutes(exportController, jwtAuth, adminOnly));
  app.use('/api/health', createHealthRoutes(new HealthController()));

  // Seed DynamicPricing for warm-up
  dynamicPricing.calculateFee(1, 2).catch(() => {});

  return app;
}

module.exports = { createApp };
