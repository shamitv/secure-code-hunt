const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/17';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

module.exports = { redis };
