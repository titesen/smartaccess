import type pg from 'pg';
import { logger } from '../../shared/logger/logger.js';
import type { IEventRepository } from '../../infrastructure/repositories/event.repository.js';
import type { RetryStrategy } from '../../infrastructure/retry/retry.strategy.js';
import { EventProcessingStatus } from '../../domain/events/event.types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;

// ---------------------------------------------------------------------------
// RetryService
// ---------------------------------------------------------------------------

export class RetryService {
    constructor(
        private readonly eventRepo: IEventRepository,
        private readonly retryStrategy: RetryStrategy,
        private readonly maxRetries: number = MAX_RETRIES,
    ) { }

    /**
     * Record a retry attempt for an event. Returns true if the event can be
     * retried, false if it has exhausted all attempts.
     */
    async recordRetry(
        client: pg.PoolClient,
        eventId: number,
        retryCount: number,
        errorMessage: string,
    ): Promise<boolean> {
        const nextAttempt = retryCount + 1;

        if (nextAttempt > this.maxRetries) {
            logger.warn('Event exhausted all retry attempts', {
                eventId,
                retryCount,
                maxRetries: this.maxRetries,
            });
            return false;
        }

        const delayMs = this.retryStrategy.getDelay(nextAttempt);
        const nextRetryAt = new Date(Date.now() + delayMs);

        // Persist retry record
        await client.query(
            `INSERT INTO event_retries (event_id, retry_attempt, next_retry_at, error_message)
             VALUES ($1, $2, $3, $4)`,
            [eventId, nextAttempt, nextRetryAt.toISOString(), errorMessage],
        );

        // Update event
        await this.eventRepo.incrementRetryCount(client, eventId);
        await this.eventRepo.updateProcessingStatus(
            client,
            eventId,
            EventProcessingStatus.RETRY_PENDING,
        );

        logger.info('Retry scheduled', {
            eventId,
            attempt: nextAttempt,
            delayMs,
            nextRetryAt: nextRetryAt.toISOString(),
        });

        return true;
    }
}
