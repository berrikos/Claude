import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — caching disabled, using in-memory fallback");
    return null;
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

// In-memory cache fallback when Redis is unavailable
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  if (redis) {
    return redis.get(key);
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  if (redis) {
    await redis.set(key, value, "EX", ttlSeconds);
    return;
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryCache.delete(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (redis) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.match(pattern.replace("*", ".*"))) {
      memoryCache.delete(key);
    }
  }
}
