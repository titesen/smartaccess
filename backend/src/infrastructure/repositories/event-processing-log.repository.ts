import type pg from 'pg';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IEventProcessingLogRepository {
    create(
        client: pg.PoolClient,
        eventId: number,
        stepName: string,
        status: string,
        message?: string,
    ): Promise<void>;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgEventProcessingLogRepository implements IEventProcessingLogRepository {
    async create(
        client: pg.PoolClient,
        eventId: number,
        stepName: string,
        status: string,
        message?: string,
    ): Promise<void> {
        await client.query(
            `INSERT INTO event_processing_logs (event_id, step_name, status, message)
             VALUES ($1, $2, $3, $4)`,
            [eventId, stepName, status, message ?? null],
        );
    }
}
