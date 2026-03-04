import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../../shared/logger/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { TokenBlacklist } from '../token-blacklist.service.js';

// ---------------------------------------------------------------------------
// Helpers — fake Redis instance
// ---------------------------------------------------------------------------

function createMockRedis() {
    return {
        connect: vi.fn().mockResolvedValue(undefined),
        setex: vi.fn().mockResolvedValue('OK'),
        exists: vi.fn().mockResolvedValue(0),
        disconnect: vi.fn(),
    };
}

describe('TokenBlacklist', () => {
    let blacklist: TokenBlacklist;

    beforeEach(() => {
        blacklist = new TokenBlacklist();
    });

    // -----------------------------------------------------------------------
    // Graceful degradation when Redis is not connected
    // -----------------------------------------------------------------------

    describe('without Redis connection', () => {
        it('blacklist() should be a no-op', async () => {
            // No connect() called → redis is null
            await expect(blacklist.blacklist('token123', 900)).resolves.toBeUndefined();
        });

        it('isBlacklisted() should return false (allow-by-default)', async () => {
            const result = await blacklist.isBlacklisted('token123');
            expect(result).toBe(false);
        });

        it('disconnect() should not throw', async () => {
            await expect(blacklist.disconnect()).resolves.toBeUndefined();
        });
    });

    // -----------------------------------------------------------------------
    // With Redis connected (via internal property injection)
    // -----------------------------------------------------------------------

    describe('with Redis connected', () => {
        let mockRedis: ReturnType<typeof createMockRedis>;

        beforeEach(() => {
            mockRedis = createMockRedis();
            // Inject mock redis via internal property
            (blacklist as any).redis = mockRedis;
        });

        it('blacklist() should call setex with correct key and TTL', async () => {
            await blacklist.blacklist('my-access-token', 600);

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'bl:my-access-token',
                600,
                '1',
            );
        });

        it('isBlacklisted() should return true when token exists', async () => {
            mockRedis.exists.mockResolvedValue(1);

            const result = await blacklist.isBlacklisted('revoked-token');

            expect(result).toBe(true);
            expect(mockRedis.exists).toHaveBeenCalledWith('bl:revoked-token');
        });

        it('isBlacklisted() should return false when token does not exist', async () => {
            mockRedis.exists.mockResolvedValue(0);

            const result = await blacklist.isBlacklisted('valid-token');
            expect(result).toBe(false);
        });

        it('isBlacklisted() should return false on Redis error (graceful degradation)', async () => {
            mockRedis.exists.mockRejectedValue(new Error('Redis connection lost'));

            const result = await blacklist.isBlacklisted('any-token');
            expect(result).toBe(false);
        });

        it('blacklist() should not throw on Redis error', async () => {
            mockRedis.setex.mockRejectedValue(new Error('Redis write error'));

            await expect(blacklist.blacklist('t', 100)).resolves.toBeUndefined();
        });
    });
});
