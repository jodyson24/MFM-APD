const Redis = require('ioredis');
const logger = require('../utils/logger');

const KEY_PREFIX = 'apd';
const redisUrl = process.env.REDIS_URL;

let client = null;
let redisReady = false;
// In-memory fallback (used when REDIS_URL is unset or Redis is unreachable).
// Stores { value, expiresAt } per full cache key.
const memory = new Map();

if (redisUrl) {
  client = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 3000,
    // Never block request handlers while Redis is down: fail fast and serve
    // from the in-memory fallback until the connection comes back.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      return Math.min(times * 1000, 10000);
    },
  });

  client.on('ready', () => {
    redisReady = true;
    logger.info('[cache] Redis connected');
  });
  client.on('error', (err) => {
    if (redisReady) {
      redisReady = false;
      logger.warn(`[cache] Redis error, switching to in-memory fallback: ${err.message}`);
    }
  });
  client.on('close', () => {
    if (redisReady) {
      redisReady = false;
      logger.warn('[cache] Redis connection closed, switching to in-memory fallback');
    }
  });

  client.connect().catch(() => {
    // Reconnects are retried in the background; in-memory fallback serves meanwhile.
  });
} else {
  logger.info('[cache] REDIS_URL not set - using in-memory cache');
}

function fullKey(key) {
  return `${KEY_PREFIX}:${key}`;
}

async function getJson(key) {
  const fk = fullKey(key);
  if (redisReady) {
    try {
      const raw = await client.get(fk);
      return raw == null ? null : JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }
  const entry = memory.get(fk);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory.delete(fk);
    return null;
  }
  return entry.value;
}

async function setJson(key, value, ttlSeconds) {
  const fk = fullKey(key);
  if (redisReady) {
    try {
      await client.set(fk, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      // ignore
    }
    return;
  }
  memory.set(fk, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function del(key) {
  const fk = fullKey(key);
  if (redisReady) {
    try {
      await client.del(fk);
    } catch (err) {
      // ignore
    }
    return;
  }
  memory.delete(fk);
}

// Delete every key under a resource namespace, e.g. prefix 'activities' clears
// 'apd:activities:*' for all scopes/queries/users.
async function delByPrefix(prefix) {
  if (redisReady) {
    try {
      const pattern = `${KEY_PREFIX}:${prefix}:*`;
      const keys = [];
      const stream = client.scanStream({ match: pattern, count: 100 });
      stream.on('data', (chunk) => keys.push(...chunk));
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (keys.length > 0) await client.del(...keys);
    } catch (err) {
      // ignore
    }
    return;
  }
  const prefixMatch = `${KEY_PREFIX}:${prefix}:`;
  for (const key of memory.keys()) {
    if (key.startsWith(prefixMatch)) memory.delete(key);
  }
}

function flushCache() {
  memory.clear();
  if (client) return client.flushdb().catch(() => {});
  return Promise.resolve();
}

async function closeCache() {
  memory.clear();
  if (client) {
    try {
      await client.quit();
    } catch (err) {
      // ignore
    }
    client = null;
    redisReady = false;
  }
}

function isReady() {
  return redisReady;
}

module.exports = {
  getJson,
  setJson,
  del,
  delByPrefix,
  flushCache,
  closeCache,
  isReady,
};
