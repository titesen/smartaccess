import type pg from 'pg';
import type { DomainEvent } from '../../domain/events/event.entity.js';
import type { EventType, EventProcessingStatus } from '../../domain/events/event.types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IEventRepository {
    findByUuid(client: pg.PoolClient, eventUuid: string): Promise<DomainEvent | null>;
    findByIdempotencyKey(client: pg.PoolClient, key: string): Promise<DomainEvent | null>;
    findAll(client: pg.PoolClient, limit?: number, offset?: number): Promise<DomainEvent[]>;
    create(client: pg.PoolClient, data: CreateEventDto): Promise<DomainEvent>;
    updateProcessingStatus(
        client: pg.PoolClient,
        id: number,
        status: EventProcessingStatus,
    ): Promise<void>;
    incrementRetryCount(client: pg.PoolClient, id: number): Promise<void>;
}

export interface CreateEventDto {
    eventUuid: string;
    deviceId: number;
    eventType: EventType;
    payload: Record<string, unknown>;
    idempotencyKey: string;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgEventRepository implements IEventRepository {
    async findByUuid(client: pg.PoolClient, eventUuid: string): Promise<DomainEvent | null> {
        const { rows } = await client.query(
            `SELECT id, event_uuid, device_id, event_type, payload, received_at, processing_status, retry_count, idempotency_key, created_at
             FROM events WHERE event_uuid = $1`,
            [eventUuid],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findByIdempotencyKey(
        client: pg.PoolClient,
        key: string,
    ): Promise<DomainEvent | null> {
        const { rows } = await client.query(
            `SELECT id, event_uuid, device_id, event_type, payload, received_at, processing_status, retry_count, idempotency_key, created_at
             FROM events WHERE idempotency_key = $1`,
            [key],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findAll(
        client: pg.PoolClient,
        limit: number = 50,
        offset: number = 0,
    ): Promise<DomainEvent[]> {
        const { rows } = await client.query(
            `SELECT id, event_uuid, device_id, event_type, payload, received_at, processing_status, retry_count, idempotency_key, created_at
             FROM events ORDER BY received_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows.map(this.mapRow);
    }

    async create(client: pg.PoolClient, data: CreateEventDto): Promise<DomainEvent> {
        const { rows } = await client.query(
            `INSERT INTO events (event_uuid, device_id, event_type, payload, idempotency_key)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, event_uuid, device_id, event_type, payload, received_at, processing_status, retry_count, idempotency_key, created_at`,
            [data.eventUuid, data.deviceId, data.eventType, JSON.stringify(data.payload), data.idempotencyKey],
        );
        return this.mapRow(rows[0]);
    }

    async updateProcessingStatus(
        client: pg.PoolClient,
        id: number,
        status: EventProcessingStatus,
    ): Promise<void> {
        await client.query(`UPDATE events SET processing_status = $2 WHERE id = $1`, [id, status]);
    }

    async incrementRetryCount(client: pg.PoolClient, id: number): Promise<void> {
        await client.query(`UPDATE events SET retry_count = retry_count + 1 WHERE id = $1`, [id]);
    }

    // -----------------------------------------------------------------------
    // Row mapper
    // -----------------------------------------------------------------------

    private mapRow(row: Record<string, unknown>): DomainEvent {
        return {
            id: row.id as number,
            eventUuid: row.event_uuid as string,
            deviceId: row.device_id as number,
            eventType: row.event_type as EventType,
            payload: row.payload as Record<string, unknown>,
            receivedAt: new Date(row.received_at as string),
            processingStatus: row.processing_status as EventProcessingStatus,
            retryCount: row.retry_count as number,
            idempotencyKey: row.idempotency_key as string,
            createdAt: new Date(row.created_at as string),
        };
    }
}
