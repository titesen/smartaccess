import { logger } from '../../shared/logger/logger.js';
import type { IBrokerAdapter, BrokerMessage } from '../../infrastructure/adapters/broker.adapter.js';
import type { EventProcessingService } from '../services/event-processing.service.js';
import { parseIncomingEvent } from '../../domain/events/event.factory.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXCHANGE_NAME = 'smartaccess.events';
const QUEUE_NAME = 'smartaccess.events.processor';
const ROUTING_PATTERN = '#'; // subscribe to all events

// ---------------------------------------------------------------------------
// EventConsumer — consumes events from the broker with ACK manual
// ---------------------------------------------------------------------------

export class EventConsumer {
    constructor(
        private readonly broker: IBrokerAdapter,
        private readonly processingService: EventProcessingService,
    ) { }

    /**
     * Start consuming events from the broker queue.
     */
    async start(): Promise<void> {
        logger.info('Starting event consumer...', { queue: QUEUE_NAME });

        await this.broker.subscribe(
            EXCHANGE_NAME,
            QUEUE_NAME,
            ROUTING_PATTERN,
            (msg) => this.handleMessage(msg),
            1, // prefetch = 1 for ordered processing
        );

        logger.info('Event consumer started');
    }

    // -----------------------------------------------------------------------
    // Internal — message handler with ACK manual
    // -----------------------------------------------------------------------

    private async handleMessage(msg: BrokerMessage): Promise<void> {
        const routingKey = msg.fields.routingKey;
        let rawEvent: unknown;

        try {
            rawEvent = JSON.parse(msg.content.toString('utf-8'));
        } catch {
            logger.error('Failed to parse message body', { routingKey });
            this.broker.nack(msg, false); // don't requeue malformed messages
            return;
        }

        try {
            // Parse and validate event structure
            const event = parseIncomingEvent(rawEvent);

            logger.debug('Processing event', {
                eventUuid: event.eventUuid,
                eventType: event.eventType,
                deviceUuid: event.deviceUuid,
                routingKey,
            });

            // Process event (idempotency, persistence, state machine — all inside a TX)
            await this.processingService.process(event);

            // BR-ACK-001 — ACK only after successful commit
            this.broker.ack(msg);

            logger.debug('Event ACKed', { eventUuid: event.eventUuid });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);

            logger.error('Event processing failed — NACKing', {
                routingKey,
                error: errorMessage,
            });

            // BR-ACK-002 — If it's a validation error, drop it. Otherwise requeue.
            if (errorMessage.startsWith('Invalid event:')) {
                this.broker.nack(msg, false); // Drop permanently
            } else {
                this.broker.nack(msg, true);  // Requeue for retry
            }
        }
    }
}
