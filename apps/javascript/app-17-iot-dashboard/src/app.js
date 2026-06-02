const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { appConfig } = require('./config/appConfig');
const { InMemoryStore } = require('./db/InMemoryStore');
const { SessionCache } = require('./cache/SessionCache');
const { UserRepository } = require('./repositories/UserRepository');
const { DeviceRepository } = require('./repositories/DeviceRepository');
const { PgDeviceRepository } = require('./repositories/PgDeviceRepository');
const { TelemetryRepository } = require('./repositories/TelemetryRepository');
const { EventConsumer } = require('./mq/EventConsumer');
const { EventProducer } = require('./mq/EventProducer');
const { KafkaProducer } = require('./mq/KafkaProducer');
const { DeviceSearchClient } = require('./search/DeviceSearchClient');
const { AuthService } = require('./services/AuthService');
const { DeviceService } = require('./services/DeviceService');
const { RefreshService } = require('./services/RefreshService');
const { TelemetryService } = require('./services/TelemetryService');
const { TelemetryQueryService } = require('./services/TelemetryQueryService');
const { DiagnosticsService } = require('./services/DiagnosticsService');
const { AuthController } = require('./controllers/AuthController');
const { DeviceController } = require('./controllers/DeviceController');
const { DiagnosticsController } = require('./controllers/DiagnosticsController');
const { HealthController } = require('./controllers/HealthController');
const { InternalTelemetryController } = require('./controllers/InternalTelemetryController');
const { createAuthRoutes } = require('./routes/authRoutes');
const { createDeviceRoutes } = require('./routes/deviceRoutes');
const { createDiagnosticsRoutes } = require('./routes/diagnosticsRoutes');
const { createHealthRoutes } = require('./routes/healthRoutes');
const { createInternalRoutes } = require('./routes/internalRoutes');

function createApp(opts) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  const store = new InMemoryStore();
  const sessions = new SessionCache();
  const users = new UserRepository(store);
  const devices = new DeviceRepository(store);
  const events = opts && opts.kafkaProducer
    ? new KafkaProducer(opts.kafkaProducer)
    : new EventProducer(new EventConsumer());
  const search = new DeviceSearchClient(appConfig, opts && opts.esClient);
  const authService = new AuthService(users, sessions, events);
  const deviceService = new DeviceService(devices, search, events);
  const refreshService = new RefreshService();
  const telemetryService = new TelemetryService(devices, appConfig);

  const telemetryRepo = new TelemetryRepository();
  const telemetryQueryService = new TelemetryQueryService(telemetryRepo);

  const requireAuth = (req, res, next) => {
    const user = authService.currentUser(req.cookies.session_id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }
    req.user = user;
    next();
  };

  const authController = new AuthController(authService);
  const deviceController = new DeviceController(authService, deviceService, refreshService, telemetryQueryService);
  const telemetryController = new InternalTelemetryController(telemetryService);

  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api/devices', createDeviceRoutes(deviceController));
  app.use('/api/internal', createInternalRoutes(telemetryController));
  app.use('/api/health', createHealthRoutes(new HealthController()));

  const diagnosticsService = new DiagnosticsService(opts && opts.esClient);
  const diagnosticsController = new DiagnosticsController(diagnosticsService);
  app.use('/api/diagnostics', requireAuth, createDiagnosticsRoutes(diagnosticsController));

  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  return app;
}

module.exports = { createApp };
