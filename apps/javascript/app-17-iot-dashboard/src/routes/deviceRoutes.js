const { Router } = require('express');

function createDeviceRoutes(controller) {
  const router = Router();
  router.post('/command', controller.requireAuth, controller.runCommand);
  router.post('/refresh', controller.requireAuth, controller.refresh);
  router.get('/:id', controller.requireAuth, controller.detail);
  router.get('/:id/telemetry', controller.requireAuth, controller.getDeviceTelemetry);
  router.post('/:id/telemetry/query', controller.requireAuth, controller.queryDeviceTelemetry);
  router.get('/:id/telemetry/range', controller.requireAuth, controller.getDeviceTelemetryRange);
  return router;
}

module.exports = { createDeviceRoutes };
