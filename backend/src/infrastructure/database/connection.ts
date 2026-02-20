import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: env.database.url,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
            logger.error('Unexpected PostgreSQL pool error', { error: err.message });
        });
    }

    return pool;
}

export async function connectDatabase(): Promise<void> {
    const p = getPool();
    const client = await p.connect();
    try {
        await client.query('SELECT 1');
        logger.info('PostgreSQL connected successfully');
    } finally {
        client.release();
    }
}

export async function getDatabaseHealth(): Promise<'ok' | 'error'> {
    try {
        const p = getPool();
        const client = await p.connect();
        try {
            await client.query('SELECT 1');
            return 'ok';
        } finally {
            client.release();
        }
    } catch {
        return 'error';
    }
}

export async function disconnectDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('PostgreSQL disconnected');
    }
}
