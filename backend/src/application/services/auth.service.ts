import crypto from 'node:crypto';
import { logger } from '../../shared/logger/logger.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { env } from '../../config/env.js';
import type { AuthUser, TokenPayload, UserRole } from '../../domain/auth/auth.types.js';

// ---------------------------------------------------------------------------
// Encrypted Token Implementation (PASETO-inspired, ChaCha20-Poly1305)
// ---------------------------------------------------------------------------
// Unlike JWT, the payload is ENCRYPTED — not just signed.
// An attacker who intercepts the token cannot read its contents.
// The format is: `sa.v1.local.<nonce-b64url>.<ciphertext-b64url>`
//   - `sa` = SmartAccess
//   - `v1` = version 1
//   - `local` = symmetric encryption (single key, like PASETO v4.local)
// ---------------------------------------------------------------------------

const TOKEN_PREFIX = 'sa.v1.local';

function deriveKey(secret: string): Buffer {
    // Derive a 32-byte key from the secret using HKDF
    return crypto.hkdfSync('sha256', secret, '', 'smartaccess-token-key', 32) as unknown as Buffer;
}

function encryptToken(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds });

    const key = deriveKey(secret);
    const iv = crypto.randomBytes(12); // 96-bit nonce for ChaCha20-Poly1305

    const cipher = crypto.createCipheriv(
        'chacha20-poly1305' as crypto.CipherGCMTypes,
        key,
        iv,
        { authTagLength: 16 },
    );

    // Use the token prefix as AAD (additional authenticated data)
    cipher.setAAD(Buffer.from(TOKEN_PREFIX), { plaintextLength: Buffer.byteLength(fullPayload, 'utf8') });

    const encrypted = Buffer.concat([cipher.update(fullPayload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: nonce + ciphertext + authTag
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return `${TOKEN_PREFIX}.${combined.toString('base64url')}`;
}

function decryptToken(token: string, secret: string): TokenPayload | null {
    const parts = token.split('.');
    // Expected: sa.v1.local.<data>
    if (parts.length !== 4 || `${parts[0]}.${parts[1]}.${parts[2]}` !== TOKEN_PREFIX) {
        return null;
    }

    try {
        const key = deriveKey(secret);
        const combined = Buffer.from(parts[3], 'base64url');

        // Extract: nonce (12 bytes) + ciphertext (variable) + authTag (16 bytes)
        if (combined.length < 28) return null; // minimum: 12 + 0 + 16

        const iv = combined.subarray(0, 12);
        const authTag = combined.subarray(combined.length - 16);
        const ciphertext = combined.subarray(12, combined.length - 16);

        const decipher = crypto.createDecipheriv(
            'chacha20-poly1305' as crypto.CipherGCMTypes,
            key,
            iv,
            { authTagLength: 16 },
        );
        decipher.setAAD(Buffer.from(TOKEN_PREFIX), { plaintextLength: ciphertext.length });
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const payload = JSON.parse(decrypted.toString('utf8')) as TokenPayload;

        // Validate expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

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

            const accessToken = encryptToken(
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
            const accessToken = encryptToken(
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

    verifyToken(token: string): TokenPayload | null {
        return decryptToken(token, env.jwt.secret);
    }
}
