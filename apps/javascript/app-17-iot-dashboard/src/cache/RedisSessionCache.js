const { redis } = require('../config/redis');

class RedisSessionCache {
  async save(sessionId, user) {
    await redis.set(`session:${sessionId}`, JSON.stringify(user), 'EX', 3600);
  }

  async get(sessionId) {
    if (!sessionId) return undefined;
    const raw = await redis.get(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  async delete(sessionId) {
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }
  }
}

module.exports = { RedisSessionCache };
