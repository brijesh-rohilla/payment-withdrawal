const Bull = require('bull');
const logger = require('../config/logger');

// Falls back to in-memory mock if Redis is unavailable (for local dev without Redis)
const withdrawalQueue = process.env.REDIS_URL
  ? new Bull('withdrawal', process.env.REDIS_URL, {
      redis: {
        tls: {},
      },
    })
  : null;

// Add a withdrawal job to the queue
const enqueue = async (data) => {
  if (withdrawalQueue) {
    return withdrawalQueue.add(data, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 2000 },
      removeOnComplete: true,
    });
  }
  // Fallback: process synchronously when Redis is unavailable
  const processor = require('./withdrawalProcessor');
  return processor(data);
};

module.exports = { withdrawalQueue, enqueue };
