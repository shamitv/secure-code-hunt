// Decoy D8: Admin guard correctly validates session role with signature check.
class AdminOnlyMiddleware {
  check(req, res, next) {
    if (req.user && req.user.role === 'ADMIN') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Admin access only.' });
  }
}

module.exports = { AdminOnlyMiddleware };
