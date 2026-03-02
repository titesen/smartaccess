import crypto from 'node:crypto';
import { logger } from '../../shared/logger/logger.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { env } from '../../config/env.js';
import type { AuthUser, JwtPayload, UserRole } from '../../domain/auth/auth.types.js';

// ---------------------------------------------------------------------------
// Simple JWT implementation (HMAC-SHA256) — no external dependency needed
// ---------------------------------------------------------------------------

function base64url(data: string): string {
    return Buffer.from(data).toString('base64url');
}

function sign(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = base64url(
        JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }),
    );
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verify(token: string, secret: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');

    if (signature !== expected) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JwtPayload;
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Simple password hashing (scrypt — built-in Node.js, no bcrypt needed)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err: Error | null, derivedKey: Buffer) => {
            if (err) reject(err);
            else resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(':');
        crypto.scrypt(password, salt, 64, (err: Error | null, derivedKey: Buffer) => {
            if (err) reject(err);
            else resolve(key === derivedKey.toString('hex'));
        });
    });
}

// ---------------------------------------------------------------------------
// Token configuration
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes (RFC best practice)
const REFRESH_TOKEN_EXPIRY_DAYS = 7;         // 7 days

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly auditRepo: IAuditRepository,
    ) { }

    /**
     * Generate an opaque refresh token and store it in the database.
     */
    private async createRefreshToken(userId: number): Promise<string> {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const token = crypto.randomBytes(48).toString('hex');
            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

            await client.query(
                `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [userId, token, expiresAt],
            );

            return token;
        } finally {
            client.release();
        }
    }

    async login(
        email: string,
        password: string,
        ipAddress?: string,
    ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser } | null> {
        const pool = getPool();
        const client = await pool.connect();

        try {
            const user = await this.userRepo.findByEmail(client, email);

            if (!user || !user.isActive) {
                await this.auditRepo.create(client, {
                    eventType: 'LOGIN_FAILED',
                    category: 'SECURITY',
                    aggregateType: 'USER',
                    aggregateId: email,
                    actor: email,
                    ipAddress: ipAddress ?? null,
                    result: 'FAILURE',
                });
                return null;
            }

            const valid = await verifyPassword(password, user.passwordHash);
            if (!valid) {
                await this.auditRepo.create(client, {
                    eventType: 'LOGIN_FAILED',
                    category: 'SECURITY',
                    aggregateType: 'USER',
                    aggregateId: email,
                    actor: email,
                    ipAddress: ipAddress ?? null,
                    result: 'FAILURE',
                });
                return null;
            }

            const accessToken = sign(
                { userId: user.id, email: user.email, role: user.role },
                env.jwt.secret,
                ACCESS_TOKEN_EXPIRY_SECONDS,
            );

            const refreshToken = await this.createRefreshToken(user.id);

            await this.auditRepo.create(client, {
                eventType: 'LOGIN_SUCCESS',
                category: 'SECURITY',
                aggregateType: 'USER',
                aggregateId: String(user.id),
                actor: email,
                ipAddress: ipAddress ?? null,
                result: 'SUCCESS',
            });

            logger.info('User logged in', { userId: user.id, email });

            return {
                accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, role: user.role },
            };
        } finally {
            client.release();
        }
    }

    /**
     * Exchange a valid refresh token for a new access token + refresh token pair.
     * The old refresh token is revoked (rotation).
     */
    async refreshAccessToken(
        refreshTokenValue: string,
    ): Promise<{ accessToken: string; refreshToken: string } | null> {
        const pool = getPool();
        const client = await pool.connect();

        try {
            const { rows } = await client.query(
                `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
                        u.email, u.role, u.is_active
                 FROM refresh_tokens rt
                 JOIN users u ON u.id = rt.user_id
                 WHERE rt.token = $1`,
                [refreshTokenValue],
            );

            if (rows.length === 0) return null;

            const row = rows[0];

            // Validate token state
            if (row.revoked || new Date(row.expires_at) < new Date() || !row.is_active) {
                return null;
            }

            // Revoke old token (rotation)
            await client.query(
                `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
                [row.id],
            );

            // Issue new pair
            const accessToken = sign(
                { userId: row.user_id, email: row.email, role: row.role },
                env.jwt.secret,
                ACCESS_TOKEN_EXPIRY_SECONDS,
            );

            const newRefreshToken = await this.createRefreshToken(row.user_id);

            logger.info('Access token refreshed', { userId: row.user_id });

            return { accessToken, refreshToken: newRefreshToken };
        } finally {
            client.release();
        }
    }

    /**
     * Revoke a refresh token (logout).
     */
    async revokeRefreshToken(refreshTokenValue: string): Promise<void> {
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query(
                `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
                [refreshTokenValue],
            );
        } finally {
            client.release();
        }
    }

    async register(
        email: string,
        password: string,
        role: UserRole,
    ): Promise<AuthUser> {
        const pool = getPool();
        const client = await pool.connect();

        try {
            const existing = await this.userRepo.findByEmail(client, email);
            if (existing) throw new Error('User already exists');

            const passwordHash = await hashPassword(password);
            const user = await this.userRepo.create(client, email, passwordHash, role);

            logger.info('User registered', { userId: user.id, email, role });
            return { id: user.id, email: user.email, role: user.role };
        } finally {
            client.release();
        }
    }

    verifyToken(token: string): JwtPayload | null {
        return verify(token, env.jwt.secret);
    }
}
