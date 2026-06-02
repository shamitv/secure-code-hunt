const jwt = require('jsonwebtoken');
const { appConfig } = require('../config/appConfig');

// CHAIN LINK 2 (chain-03): JWT verification trusts any token signed with the hardcoded secret.
class JwtAuthMiddleware {
  verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, appConfig.jwtSecret);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
  }

  optionalToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        req.user = jwt.verify(authHeader.split(' ')[1], appConfig.jwtSecret);
      } catch (_) {}
    }
    return next();
  }
}

module.exports = { JwtAuthMiddleware };
