const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthService {
  constructor(users, sessions, events) {
    this.users = users;
    this.sessions = sessions;
    this.events = events;
  }

  async register(username, password) {
    return this.users.saveCustomer(username, password);
  }

  async login(username, password) {
    const user = await this.users.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return undefined;
    }
    const sessionId = crypto.randomBytes(16).toString('hex');
    const publicUser = { id: user.id, username: user.username, role: user.role };
    await this.sessions.save(sessionId, publicUser);
    this.events.publish('auth.login', { userId: user.id });
    return { sessionId, user: publicUser };
  }

  async logout(sessionId) {
    await this.sessions.delete(sessionId);
  }

  async currentUser(sessionId) {
    return this.sessions.get(sessionId);
  }
}

module.exports = { AuthService };
