import { logger } from '../../shared/logger/logger.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { IOutboxRepository } from './outbox.repository.js';
import type { IBrokerAdapter } from '../../infrastructure/adapters/broker.adapter.js';

// ---------------------------------------------------------------------------
// OutboxProcessor — background worker that publishes pending outbox entries
// ---------------------------------------------------------------------------

export class OutboxProcessor {
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;

    constructor(
        private readonly outboxRepo: IOutboxRepository,
        private readonly broker: IBrokerAdapter,
        private readonly pollIntervalMs: number = 5000,
    ) { }

    start(): void {
        if (this.running) return;
        this.running = true;

        logger.info('Outbox processor started', { pollIntervalMs: this.pollIntervalMs });

        this.timer = setInterval(() => {
            this.processOutbox().catch((err) => {
                logger.error('Outbox processing cycle failed', {
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }, this.pollIntervalMs);
    }

    stop(): void {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        logger.info('Outbox processor stopped');
    }

    // -----------------------------------------------------------------------
    // Internal — process a batch of unpublished outbox entries
    // -----------------------------------------------------------------------

    private async processOutbox(): Promise<void> {
        const pool = getPool();
        const client = await pool.connect();
        let count = 0;

        try {
            await client.query('BEGIN');
            const entries = await this.outboxRepo.findUnpublished(client, 50);

            for (const entry of entries) {
                try {
                    const routingKey = `${entry.aggregateType.toLowerCase()}.${entry.eventType.toLowerCase()}`;
                    const body = Buffer.from(JSON.stringify(entry.payload));

                    await this.broker.publish('smartaccess.events', routingKey, body, {
                        messageId: String(entry.id),
                    });

                    await this.outboxRepo.markAsPublished(client, entry.id);
                    count++;
                } catch (err) {
                    logger.error('Failed to publish outbox entry', {
                        entryId: entry.id,
                        error: err instanceof Error ? err.message : String(err),
                    });
                    // Continue with next entry
                }
            }

            await client.query('COMMIT');

            if (count > 0) {
                logger.info(`Outbox: published ${count} entries`);
            }
        } catch (err) {
            await client.query('ROLLBACK').catch(() => { });
            throw err;
        } finally {
            client.release();
        }
    }
}
