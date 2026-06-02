const { Router } = require('express');

function createSpotRoutes(controller) {
  const router = Router();
  router.get('/search', controller.search);
  router.get('/:id', controller.detail);
  router.get('/:id/layout', controller.getLayout);
  router.post('/:id/photo', controller.requireAuth, controller.requireAdmin, controller.importPhoto);
  return router;
}

module.exports = { createSpotRoutes };
