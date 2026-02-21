import type pg from 'pg';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface OutboxEntry {
    id: number;
    aggregateType: string;
    aggregateId: number;
    eventType: string;
    payload: Record<string, unknown>;
    published: boolean;
    publishedAt: Date | null;
    createdAt: Date;
}

export interface CreateOutboxDto {
    aggregateType: string;
    aggregateId: number;
    eventType: string;
    payload: Record<string, unknown>;
}

export interface IOutboxRepository {
    create(client: pg.PoolClient, data: CreateOutboxDto): Promise<void>;
    findUnpublished(client: pg.PoolClient, limit?: number): Promise<OutboxEntry[]>;
    markAsPublished(client: pg.PoolClient, id: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgOutboxRepository implements IOutboxRepository {
    async create(client: pg.PoolClient, data: CreateOutboxDto): Promise<void> {
        await client.query(
            `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
             VALUES ($1, $2, $3, $4)`,
            [data.aggregateType, data.aggregateId, data.eventType, JSON.stringify(data.payload)],
        );
    }

    async findUnpublished(client: pg.PoolClient, limit: number = 100): Promise<OutboxEntry[]> {
        const { rows } = await client.query(
            `SELECT id, aggregate_type, aggregate_id, event_type, payload, published, published_at, created_at
             FROM outbox_events
             WHERE published = FALSE
             ORDER BY created_at ASC
             LIMIT $1
             FOR UPDATE SKIP LOCKED`,
            [limit],
        );
        return rows.map(this.mapRow);
    }

    async markAsPublished(client: pg.PoolClient, id: number): Promise<void> {
        await client.query(
            `UPDATE outbox_events SET published = TRUE, published_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id],
        );
    }

    private mapRow(row: Record<string, unknown>): OutboxEntry {
        return {
            id: row.id as number,
            aggregateType: row.aggregate_type as string,
            aggregateId: row.aggregate_id as number,
            eventType: row.event_type as string,
            payload: row.payload as Record<string, unknown>,
            published: row.published as boolean,
            publishedAt: row.published_at ? new Date(row.published_at as string) : null,
            createdAt: new Date(row.created_at as string),
        };
    }
}
