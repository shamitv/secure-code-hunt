const { Router } = require('express');

function createExportRoutes(exportController, jwtAuth, adminOnly) {
  const router = Router();
  router.post('/bookings', jwtAuth.verifyToken, adminOnly.check, exportController.exportBookings);
  return router;
}

module.exports = { createExportRoutes };
