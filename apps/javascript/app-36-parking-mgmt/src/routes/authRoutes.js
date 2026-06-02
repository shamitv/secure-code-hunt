const { Router } = require('express');

function createAuthRoutes(controller) {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', controller.logout);
  router.post('/jwt-login', controller.jwtLogin);
  router.post('/refresh', controller.refreshToken);
  return router;
}

module.exports = { createAuthRoutes };
