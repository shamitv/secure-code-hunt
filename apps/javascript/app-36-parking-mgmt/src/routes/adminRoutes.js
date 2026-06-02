const { Router } = require('express');

function createAdminRoutes(adminController, spotController) {
  const router = Router();
  router.get('/debug', adminController.debugConfig);
  router.post('/spots', spotController.requireAuth, spotController.requireAdmin, spotController.create);
  router.get('/dashboard', adminController.dashboard);
  return router;
}

module.exports = { createAdminRoutes };
