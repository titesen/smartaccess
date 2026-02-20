import Redis from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';

let client: Redis | null = null;

export function getRedisClient(): Redis {
    if (!client) {
        client = new Redis(env.redis.url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 200, 3000);
                return delay;
            },
        });

        client.on('error', (err) => {
            logger.error('Redis connection error', { error: err.message });
        });

        client.on('connect', () => {
            logger.info('Redis connected successfully');
        });
    }

    return client;
}

export async function connectCache(): Promise<void> {
    const c = getRedisClient();
    await c.ping();
}

export async function getCacheHealth(): Promise<'ok' | 'error'> {
    try {
        if (!client) return 'error';
        const result = await client.ping();
        return result === 'PONG' ? 'ok' : 'error';
    } catch {
        return 'error';
    }
}

export async function disconnectCache(): Promise<void> {
    if (client) {
        client.disconnect();
        client = null;
        logger.info('Redis disconnected');
    }
}
