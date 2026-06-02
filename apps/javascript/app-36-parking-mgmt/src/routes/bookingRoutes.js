const { Router } = require('express');

function createBookingRoutes(controller) {
  const router = Router();
  router.get('/', controller.requireAuth, controller.listAll);
  router.get('/:id', controller.requireAuth, controller.getById);
  router.post('/book', controller.requireAuth, controller.book);
  router.post('/:id/cancel', controller.requireAuth, controller.cancel);
  return router;
}

module.exports = { createBookingRoutes };
