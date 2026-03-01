import type pg from 'pg';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
    id: number;
    eventType: string;
    category: 'DOMAIN' | 'TECHNICAL' | 'SECURITY';
    aggregateType: string;
    aggregateId: string;
    previousState: Record<string, unknown> | null;
    newState: Record<string, unknown> | null;
    actor: string;
    ipAddress: string | null;
    correlationId: string | null;
    result: 'SUCCESS' | 'FAILURE';
    createdAt: Date;
}

export interface CreateAuditLogDto {
    eventType: string;
    category: 'DOMAIN' | 'TECHNICAL' | 'SECURITY';
    aggregateType: string;
    aggregateId: string;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    actor: string;
    ipAddress?: string | null;
    correlationId?: string | null;
    result: 'SUCCESS' | 'FAILURE';
}

export interface IAuditRepository {
    create(client: pg.PoolClient, data: CreateAuditLogDto): Promise<void>;
    findWithPagination(client: pg.PoolClient, limit: number, offset: number): Promise<AuditLogEntry[]>;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgAuditRepository implements IAuditRepository {
    async create(client: pg.PoolClient, data: CreateAuditLogDto): Promise<void> {
        await client.query(
            `INSERT INTO audit_log (event_type, category, aggregate_type, aggregate_id, previous_state, new_state, actor, ip_address, correlation_id, result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                data.eventType,
                data.category,
                data.aggregateType,
                data.aggregateId,
                data.previousState ? JSON.stringify(data.previousState) : null,
                data.newState ? JSON.stringify(data.newState) : null,
                data.actor,
                data.ipAddress ?? null,
                data.correlationId ?? null,
                data.result,
            ],
        );
    }

    async findWithPagination(client: pg.PoolClient, limit: number, offset: number): Promise<AuditLogEntry[]> {
        const { rows } = await client.query(
            `SELECT id, event_type, category, aggregate_type, aggregate_id, 
                    previous_state, new_state, actor, ip_address, correlation_id, result, created_at
             FROM audit_log
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return rows.map((row) => ({
            id: parseInt(row.id, 10),
            eventType: row.event_type,
            category: row.category,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            previousState: row.previous_state,
            newState: row.new_state,
            actor: row.actor,
            ipAddress: row.ip_address,
            correlationId: row.correlation_id,
            result: row.result,
            createdAt: row.created_at,
        }));
    }
}
