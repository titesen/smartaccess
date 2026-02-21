import type pg from 'pg';
import { logger } from '../../shared/logger/logger.js';
import type { IEventRepository } from '../../infrastructure/repositories/event.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { EventProcessingStatus } from '../../domain/events/event.types.js';

// ---------------------------------------------------------------------------
// DLQ (Dead Letter Queue) Service
// ---------------------------------------------------------------------------

export class DlqService {
    constructor(
        private readonly eventRepo: IEventRepository,
        private readonly auditRepo: IAuditRepository,
    ) { }

    /**
     * Move an event to the Dead Letter table after exhausting all retry attempts.
     */
    async moveToDeadLetter(
        client: pg.PoolClient,
        eventId: number,
        failureReason: string,
    ): Promise<void> {
        // 1. Get the event
        const event = await client.query(
            `SELECT event_uuid, payload FROM events WHERE id = $1`,
            [eventId],
        );

        if (event.rows.length === 0) {
            logger.error('Cannot move to DLQ — event not found', { eventId });
            return;
        }

        const { event_uuid, payload } = event.rows[0];

        // 2. Insert into dead_letter_events
        await client.query(
            `INSERT INTO dead_letter_events (original_event_id, payload, failure_reason)
             VALUES ($1, $2, $3)`,
            [eventId, JSON.stringify(payload), failureReason],
        );

        // 3. Update event status to DEAD_LETTERED
        await this.eventRepo.updateProcessingStatus(
            client,
            eventId,
            EventProcessingStatus.DEAD_LETTERED,
        );

        // 4. Audit log
        await this.auditRepo.create(client, {
            eventType: 'EVENT_DEAD_LETTERED',
            category: 'TECHNICAL',
            aggregateType: 'EVENT',
            aggregateId: event_uuid,
            newState: { failureReason },
            actor: 'SYSTEM',
            correlationId: event_uuid,
            result: 'FAILURE',
        });

        logger.warn('Event moved to Dead Letter Queue', {
            eventId,
            eventUuid: event_uuid,
            failureReason,
        });
    }
}
