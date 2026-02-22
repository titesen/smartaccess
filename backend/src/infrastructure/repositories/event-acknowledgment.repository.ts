import { Pool, PoolClient } from 'pg';
import { getPool } from '../database/connection.js';

interface AcknowledgmentRow {
    id: number;
    event_id: number;
    ack_status: 'PENDING' | 'ACKED' | 'NACKED' | 'TIMEOUT';
    acked_at: Date | null;
    consumer_name: string;
    created_at: Date;
}

export class PgEventAcknowledgmentRepository {
    private pool: Pool;

    constructor() {
        this.pool = getPool();
    }

    async create(
        client: PoolClient,
        entry: {
            eventId: number;
            consumerName: string;
            ackStatus?: 'PENDING' | 'ACKED' | 'NACKED' | 'TIMEOUT';
        },
    ): Promise<AcknowledgmentRow> {
        const result = await client.query(
            `INSERT INTO event_acknowledgments (event_id, consumer_name, ack_status)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [entry.eventId, entry.consumerName, entry.ackStatus ?? 'PENDING'],
        );
        return result.rows[0];
    }

    async updateStatus(
        client: PoolClient,
        id: number,
        status: 'ACKED' | 'NACKED' | 'TIMEOUT',
    ): Promise<AcknowledgmentRow> {
        const ackedAt = status === 'ACKED' ? 'CURRENT_TIMESTAMP' : 'NULL';
        const result = await client.query(
            `UPDATE event_acknowledgments
             SET ack_status = $1, acked_at = ${ackedAt === 'NULL' ? 'NULL' : 'CURRENT_TIMESTAMP'}
             WHERE id = $2
             RETURNING *`,
            [status, id],
        );
        return result.rows[0];
    }

    async findByEventId(eventId: number): Promise<AcknowledgmentRow[]> {
        const result = await this.pool.query(
            `SELECT * FROM event_acknowledgments
             WHERE event_id = $1
             ORDER BY created_at DESC`,
            [eventId],
        );
        return result.rows;
    }

    async findPending(limit = 100): Promise<AcknowledgmentRow[]> {
        const result = await this.pool.query(
            `SELECT * FROM event_acknowledgments
             WHERE ack_status = 'PENDING'
             ORDER BY created_at ASC
             LIMIT $1`,
            [limit],
        );
        return result.rows;
    }
}
