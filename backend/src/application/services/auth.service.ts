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
// AuthService
// ---------------------------------------------------------------------------

const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

export class AuthService {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly auditRepo: IAuditRepository,
    ) { }

    async login(
        email: string,
        password: string,
        ipAddress?: string,
    ): Promise<{ token: string; user: AuthUser } | null> {
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

            const token = sign(
                { userId: user.id, email: user.email, role: user.role },
                env.jwt.secret,
                TOKEN_EXPIRY_SECONDS,
            );

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
                token,
                user: { id: user.id, email: user.email, role: user.role },
            };
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
