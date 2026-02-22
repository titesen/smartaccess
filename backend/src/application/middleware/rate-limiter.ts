import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import logger from '../../infrastructure/observability/logger';

// ---------------------------------------------------------------------------
// Redis-based Rate Limiter — Sliding Window
// ---------------------------------------------------------------------------

interface RateLimitConfig {
    windowMs: number;   // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 60_000,     // 1 minute
    maxRequests: 100,
    keyPrefix: 'rl',
};

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient) return redisClient;

    try {
        const client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        }) as RedisClientType;

        client.on('error', (err) => {
            logger.warn('Rate limiter Redis error — falling back to no-limit', { error: err.message });
        });

        await client.connect();
        redisClient = client;
        return client;
    } catch {
        logger.warn('Rate limiter could not connect to Redis — disabled');
        return null;
    }
}

/**
 * Creates a rate-limiting middleware using Redis sliding window counter.
 * Falls back to no-limit if Redis is unavailable (graceful degradation).
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
    const { windowMs, maxRequests, keyPrefix } = { ...DEFAULT_CONFIG, ...config };

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const client = await getRedisClient();

        // Graceful degradation: if Redis is down, allow the request
        if (!client) {
            next();
            return;
        }

        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const windowSec = Math.ceil(windowMs / 1000);

        try {
            const current = await client.incr(key);

            if (current === 1) {
                await client.expire(key, windowSec);
            }

            // Set rate-limit headers (draft-ietf-httpapi-ratelimit-headers)
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

            const ttl = await client.ttl(key);
            res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

            if (current > maxRequests) {
                logger.warn('Rate limit exceeded', { ip, current, max: maxRequests });
                res.status(429).json({
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Too many requests. Limit: ${maxRequests} per ${windowSec}s`,
                    },
                });
                return;
            }

            next();
        } catch (err) {
            // Redis error during check — allow request (graceful degradation)
            logger.warn('Rate limiter error — allowing request', { error: (err as Error).message });
            next();
        }
    };
}
