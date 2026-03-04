import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// We test the *exported* functions (hashPassword) and AuthService class.
// encryptToken / decryptToken are private module functions — we reach them
// indirectly through AuthService.verifyToken and the login flow.
// ---------------------------------------------------------------------------

// Mock external dependencies BEFORE importing the module under test
vi.mock('../../../shared/logger/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../config/env.js', () => ({
    env: {
        jwt: { secret: 'test-secret-key-for-unit-tests', expiration: '15m' },
    },
}));

// Mock getPool to return a fake client
const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
};
const mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };
vi.mock('../../../infrastructure/database/connection.js', () => ({
    getPool: () => mockPool,
}));

import { AuthService, hashPassword } from '../auth.service.js';
import type { IUserRepository } from '../../../infrastructure/repositories/user.repository.js';
import type { IAuditRepository } from '../../../infrastructure/repositories/audit.repository.js';
import { UserRole } from '../../../domain/auth/auth.types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockUserRepo(): IUserRepository {
    return {
        findByEmail: vi.fn(),
        create: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
    } as unknown as IUserRepository;
}

function createMockAuditRepo(): IAuditRepository {
    return {
        create: vi.fn(),
    } as unknown as IAuditRepository;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Crypto: hashPassword / verifyPassword', () => {
    it('should generate a hash with salt:key format', async () => {
        const hash = await hashPassword('mypassword');
        expect(hash).toContain(':');
        const [salt, key] = hash.split(':');
        expect(salt).toHaveLength(32);  // 16 bytes hex = 32 chars
        expect(key).toHaveLength(128);  // 64 bytes hex = 128 chars
    });

    it('should generate different hashes for the same password (unique salts)', async () => {
        const hash1 = await hashPassword('samepass');
        const hash2 = await hashPassword('samepass');
        expect(hash1).not.toBe(hash2);
    });
});

describe('AuthService', () => {
    let userRepo: IUserRepository;
    let auditRepo: IAuditRepository;
    let authService: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();
        userRepo = createMockUserRepo();
        auditRepo = createMockAuditRepo();
        authService = new AuthService(userRepo, auditRepo);
    });

    // -----------------------------------------------------------------------
    // Token encrypt / decrypt (via verifyToken)
    // -----------------------------------------------------------------------

    describe('verifyToken (encrypt → decrypt round-trip)', () => {
        it('should return null for a completely invalid token', () => {
            expect(authService.verifyToken('not-a-real-token')).toBeNull();
        });

        it('should return null for a token with wrong prefix', () => {
            expect(authService.verifyToken('xx.v1.local.aabbcc')).toBeNull();
        });

        it('should return null for a token with truncated data', () => {
            expect(authService.verifyToken('sa.v1.local.dG9vc2hvcnQ')).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // login
    // -----------------------------------------------------------------------

    describe('login', () => {
        it('should return null if user is not found', async () => {
            vi.mocked(userRepo.findByEmail).mockResolvedValue(null);

            const result = await authService.login('nobody@test.com', 'pass');

            expect(result).toBeNull();
            expect(auditRepo.create).toHaveBeenCalledWith(
                mockClient,
                expect.objectContaining({ eventType: 'LOGIN_FAILED', result: 'FAILURE' }),
            );
        });

        it('should return null if user is inactive', async () => {
            vi.mocked(userRepo.findByEmail).mockResolvedValue({
                id: 1, email: 'test@test.com', passwordHash: 'salt:key',
                role: UserRole.ADMIN, isActive: false,
                createdAt: new Date(), updatedAt: new Date(),
            });

            const result = await authService.login('test@test.com', 'pass');
            expect(result).toBeNull();
        });

        it('should return null for incorrect password', async () => {
            const correctHash = await hashPassword('correctpass');
            vi.mocked(userRepo.findByEmail).mockResolvedValue({
                id: 1, email: 'test@test.com', passwordHash: correctHash,
                role: UserRole.ADMIN, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
            });

            const result = await authService.login('test@test.com', 'wrongpass');
            expect(result).toBeNull();
        });

        it('should return tokens + user for valid credentials', async () => {
            const correctHash = await hashPassword('goodpass');
            vi.mocked(userRepo.findByEmail).mockResolvedValue({
                id: 42, email: 'admin@test.com', passwordHash: correctHash,
                role: UserRole.ADMIN, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
            });
            mockClient.query.mockResolvedValue({ rows: [] }); // refresh token INSERT

            const result = await authService.login('admin@test.com', 'goodpass');

            expect(result).not.toBeNull();
            expect(result!.accessToken).toMatch(/^sa\.v1\.local\./);
            expect(result!.refreshToken).toBeTruthy();
            expect(result!.user).toEqual({
                id: 42, email: 'admin@test.com', role: UserRole.ADMIN,
            });
        });

        it('should create an audit log entry on successful login', async () => {
            const correctHash = await hashPassword('pass123');
            vi.mocked(userRepo.findByEmail).mockResolvedValue({
                id: 1, email: 'u@t.com', passwordHash: correctHash,
                role: UserRole.OPERATOR, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
            });
            mockClient.query.mockResolvedValue({ rows: [] });

            await authService.login('u@t.com', 'pass123', '192.168.1.1');

            expect(auditRepo.create).toHaveBeenCalledWith(
                mockClient,
                expect.objectContaining({
                    eventType: 'LOGIN_SUCCESS',
                    result: 'SUCCESS',
                    ipAddress: '192.168.1.1',
                }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // register
    // -----------------------------------------------------------------------

    describe('register', () => {
        it('should throw if user already exists', async () => {
            vi.mocked(userRepo.findByEmail).mockResolvedValue({
                id: 1, email: 'dup@t.com', passwordHash: 'x:y',
                role: UserRole.VIEWER, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
            });

            await expect(
                authService.register('dup@t.com', 'pass', UserRole.VIEWER),
            ).rejects.toThrow('User already exists');
        });

        it('should create user and return AuthUser', async () => {
            vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
            vi.mocked(userRepo.create).mockResolvedValue({
                id: 99, email: 'new@t.com', passwordHash: 'hash',
                role: UserRole.OPERATOR, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
            });

            const result = await authService.register('new@t.com', 'pass', UserRole.OPERATOR);

            expect(result).toEqual({
                id: 99, email: 'new@t.com', role: UserRole.OPERATOR,
            });
            expect(userRepo.create).toHaveBeenCalledWith(
                mockClient, 'new@t.com', expect.any(String), UserRole.OPERATOR,
            );
        });
    });

    // -----------------------------------------------------------------------
    // revokeRefreshToken
    // -----------------------------------------------------------------------

    describe('revokeRefreshToken', () => {
        it('should execute UPDATE query to revoke the token', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });

            await authService.revokeRefreshToken('some-refresh-token');

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('SET revoked = TRUE'),
                ['some-refresh-token'],
            );
        });
    });
});
