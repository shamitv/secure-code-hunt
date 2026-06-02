class SessionCache {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async save(sessionId, user) {
    await this.redis.setEx('session:' + sessionId, 86400, JSON.stringify(user));
  }

  async get(sessionId) {
    if (!sessionId) return undefined;
    const data = await this.redis.get('session:' + sessionId);
    return data ? JSON.parse(data) : undefined;
  }

  async delete(sessionId) {
    if (sessionId) {
      await this.redis.del('session:' + sessionId);
    }
  }
}

module.exports = { SessionCache };
