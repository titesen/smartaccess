import { getPool } from './connection.js';
import { logger } from '../../shared/logger/logger.js';
import type pg from 'pg';

// ---------------------------------------------------------------------------
// UnitOfWork — wraps a single PostgreSQL transaction
// ---------------------------------------------------------------------------

export class UnitOfWork {
    private client: pg.PoolClient | null = null;

    /** Acquire a client and BEGIN transaction. */
    async begin(): Promise<pg.PoolClient> {
        const pool = getPool();
        this.client = await pool.connect();
        await this.client.query('BEGIN');
        logger.debug('Transaction started');
        return this.client;
    }

    /** COMMIT and release. */
    async commit(): Promise<void> {
        if (!this.client) throw new Error('No active transaction');
        await this.client.query('COMMIT');
        logger.debug('Transaction committed');
        this.client.release();
        this.client = null;
    }

    /** ROLLBACK and release. */
    async rollback(): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.query('ROLLBACK');
            logger.debug('Transaction rolled back');
        } finally {
            this.client.release();
            this.client = null;
        }
    }

    /** Get the current client (must be inside a transaction). */
    getClient(): pg.PoolClient {
        if (!this.client) throw new Error('No active transaction — call begin() first');
        return this.client;
    }

    /**
     * Execute a callback inside a transaction.
     * Auto-commits on success, rollbacks on error.
     */
    async execute<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
        const client = await this.begin();
        try {
            const result = await fn(client);
            await this.commit();
            return result;
        } catch (err) {
            await this.rollback();
            throw err;
        }
    }
}
