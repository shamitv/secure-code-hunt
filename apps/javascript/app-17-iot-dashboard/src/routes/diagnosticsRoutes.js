const { Router } = require('express');

function createDiagnosticsRoutes(controller) {
  const router = Router();
  router.get('/search', controller.search);
  router.get('/search/safe', controller.searchSafe);
  return router;
}

module.exports = { createDiagnosticsRoutes };
