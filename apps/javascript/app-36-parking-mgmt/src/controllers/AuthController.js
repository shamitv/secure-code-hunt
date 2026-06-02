const jwt = require('jsonwebtoken');
const { appConfig } = require('../config/appConfig');
const bcrypt = require('bcryptjs');

class AuthController {
  constructor(authService, pool) {
    this.authService = authService;
    this.pool = pool;
  }

  register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
      const user = await this.authService.register(username, password);
      return res.status(201).json({ message: 'User registered successfully.', userId: user.id });
    } catch (_err) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
  };

  login = async (req, res) => {
    const { username, password } = req.body;
    const session = await this.authService.login(username, password);
    if (!session) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.cookie('session_id', session.sessionId, { httpOnly: true });
    return res.json({ message: 'Login successful.', role: session.user.role });
  };

  logout = async (req, res) => {
    await this.authService.logout(req.cookies.session_id);
    res.clearCookie('session_id');
    return res.json({ message: 'Logged out successfully.' });
  };

  // VULNERABILITY A02: JWT signed with hardcoded secret from appConfig.
  jwtLogin = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const user = await this.authService.users.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      appConfig.jwtSecret,
      { expiresIn: appConfig.jwtExpiry }
    );
    return res.json({ token });
  };

  // Decoy D7: Refresh token validates iss/aud/exp claims and uses rotating secret.
  refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required.' });
    }
    try {
      const decoded = jwt.verify(refreshToken, appConfig.jwtSecret);
      if (decoded.iss !== 'parking-mgmt') {
        return res.status(401).json({ error: 'Invalid issuer.' });
      }
      if (decoded.aud !== 'api') {
        return res.status(401).json({ error: 'Invalid audience.' });
      }
      const newToken = jwt.sign(
        { sub: decoded.sub, username: decoded.username, role: decoded.role },
        appConfig.jwtSecret,
        { expiresIn: appConfig.jwtExpiry }
      );
      return res.json({ token: newToken });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
  };
}

module.exports = { AuthController };
