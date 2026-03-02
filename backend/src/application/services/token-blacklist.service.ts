import Redis from 'ioredis';
import { logger } from '../../shared/logger/logger.js';

// ---------------------------------------------------------------------------
// Token Blacklist — Redis-backed
// ---------------------------------------------------------------------------
// Used for immediate revocation of access tokens.
// Each blacklisted token is stored with a TTL matching the token's remaining
// lifetime, so entries auto-expire from Redis.
// ---------------------------------------------------------------------------

const BLACKLIST_PREFIX = 'bl:';

export class TokenBlacklist {
    private redis: Redis | null = null;

    async connect(redisUrl: string): Promise<void> {
        try {
            this.redis = new Redis(redisUrl, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null,
            });
            await this.redis.connect();
            logger.info('Token blacklist connected to Redis');
        } catch (err) {
            logger.warn('Token blacklist Redis unavailable — graceful degradation', {
                error: err instanceof Error ? err.message : String(err),
            });
            this.redis = null;
        }
    }

    /**
     * Add a token to the blacklist.
     * @param token - The access token string
     * @param ttlSeconds - Time-to-live (should match the token's remaining lifetime)
     */
    async blacklist(token: string, ttlSeconds: number): Promise<void> {
        if (!this.redis) return;

        try {
            const key = `${BLACKLIST_PREFIX}${token}`;
            await this.redis.setex(key, ttlSeconds, '1');
            logger.info('Token blacklisted', { ttlSeconds });
        } catch (err) {
            logger.warn('Failed to blacklist token', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    /**
     * Check if a token is blacklisted.
     */
    async isBlacklisted(token: string): Promise<boolean> {
        if (!this.redis) return false;

        try {
            const result = await this.redis.exists(`${BLACKLIST_PREFIX}${token}`);
            return result === 1;
        } catch {
            // On Redis failure, allow the request (graceful degradation)
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.redis) {
            try {
                this.redis.disconnect();
            } catch { /* ignore */ }
        }
    }
}
