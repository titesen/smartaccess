import { getRedisClient } from '../cache/connection.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ICacheAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Redis Implementation
// ---------------------------------------------------------------------------

export class RedisCacheAdapter implements ICacheAdapter {
    async get(key: string): Promise<string | null> {
        const client = getRedisClient();
        return client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        const client = getRedisClient();
        if (ttlSeconds) {
            await client.set(key, value, 'EX', ttlSeconds);
        } else {
            await client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        const client = getRedisClient();
        await client.del(key);
    }
}
