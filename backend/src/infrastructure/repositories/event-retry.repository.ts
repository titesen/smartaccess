import { Pool, PoolClient } from 'pg';
import { getPool } from '../database/connection.js';

interface EventRetryRow {
    id: number;
    event_id: number;
    retry_attempt: number;
    next_retry_at: Date;
    error_message: string | null;
    created_at: Date;
}

export class PgEventRetryRepository {
    private pool: Pool;

    constructor() {
        this.pool = getPool();
    }

    async create(
        client: PoolClient,
        entry: {
            eventId: number;
            retryAttempt: number;
            nextRetryAt: Date;
            errorMessage?: string;
        },
    ): Promise<EventRetryRow> {
        const result = await client.query(
            `INSERT INTO event_retries (event_id, retry_attempt, next_retry_at, error_message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [entry.eventId, entry.retryAttempt, entry.nextRetryAt, entry.errorMessage ?? null],
        );
        return result.rows[0];
    }

    async findByEventId(eventId: number): Promise<EventRetryRow[]> {
        const result = await this.pool.query(
            `SELECT * FROM event_retries
             WHERE event_id = $1
             ORDER BY retry_attempt ASC`,
            [eventId],
        );
        return result.rows;
    }

    async findDueRetries(limit = 100): Promise<EventRetryRow[]> {
        const result = await this.pool.query(
            `SELECT er.*, e.event_uuid, e.event_type, e.payload
             FROM event_retries er
             JOIN events e ON e.id = er.event_id
             WHERE er.next_retry_at <= CURRENT_TIMESTAMP
             ORDER BY er.next_retry_at ASC
             LIMIT $1`,
            [limit],
        );
        return result.rows;
    }

    async getLatestAttempt(eventId: number): Promise<EventRetryRow | null> {
        const result = await this.pool.query(
            `SELECT * FROM event_retries
             WHERE event_id = $1
             ORDER BY retry_attempt DESC
             LIMIT 1`,
            [eventId],
        );
        return result.rows[0] ?? null;
    }

    async countByEventId(eventId: number): Promise<number> {
        const result = await this.pool.query(
            `SELECT COUNT(*)::int AS count FROM event_retries WHERE event_id = $1`,
            [eventId],
        );
        return result.rows[0].count;
    }
}
