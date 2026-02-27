import { logger } from '../../shared/logger/logger.js';
import { type IUserRepository } from '../repositories/user.repository.js';
import { UserRole } from '../../domain/auth/auth.types.js';
import type pg from 'pg';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Re-uses the same scrypt hasher as AuthService to avoid importing it
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err: Error | null, derivedKey: Buffer) => {
            if (err) reject(err);
            else resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

export async function seedDefaultAdmin(
    client: pg.PoolClient,
    userRepo: IUserRepository,
): Promise<void> {
    const email = process.env.ADMIN_EMAIL ?? 'admin@smartaccess.io';
    const password = process.env.ADMIN_PASSWORD ?? 'admin123';

    try {
        const existing = await userRepo.findByEmail(client, email);
        if (existing) {
            logger.debug('Default admin already exists — skipping seed', { email });
            return;
        }

        const passwordHash = await hashPassword(password);
        await userRepo.create(client, email, passwordHash, UserRole.ADMIN);
        logger.info('Default admin user created', { email });
    } catch (err) {
        logger.warn('Failed to seed default admin — this is non-fatal', {
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
