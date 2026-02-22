import { logger } from '../../shared/logger/logger.js';

type EventHandler = (data: Record<string, unknown>) => void | Promise<void>;

/**
 * Domain Event Observer (Publisher/Subscriber).
 *
 * Decouples side-effects from core domain logic. When an event is processed,
 * observers are notified asynchronously without blocking the main flow.
 *
 * Usage:
 *   eventObserver.on('EVENT_PROCESSED', async (data) => { ... });
 *   eventObserver.on('DEVICE_STATUS_CHANGED', async (data) => { ... });
 *   await eventObserver.emit('EVENT_PROCESSED', { eventId, deviceId });
 */
export class EventObserver {
    private handlers: Map<string, EventHandler[]> = new Map();

    /**
     * Register a handler for a specific event type.
     */
    on(eventType: string, handler: EventHandler): void {
        const existing = this.handlers.get(eventType) ?? [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
    }

    /**
     * Remove a specific handler for an event type.
     */
    off(eventType: string, handler: EventHandler): void {
        const existing = this.handlers.get(eventType);
        if (!existing) return;
        this.handlers.set(
            eventType,
            existing.filter((h) => h !== handler),
        );
    }

    /**
     * Emit an event to all registered handlers.
     * Handlers run concurrently. Failures are logged but do not propagate.
     */
    async emit(eventType: string, data: Record<string, unknown>): Promise<void> {
        const handlers = this.handlers.get(eventType);
        if (!handlers || handlers.length === 0) return;

        const results = await Promise.allSettled(
            handlers.map((handler) => handler(data)),
        );

        for (const result of results) {
            if (result.status === 'rejected') {
                logger.error('EventObserver handler failed', {
                    eventType,
                    error: result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason),
                });
            }
        }
    }

    /**
     * List all registered event types and their handler counts.
     */
    listRegistrations(): Record<string, number> {
        const registrations: Record<string, number> = {};
        for (const [eventType, handlers] of this.handlers.entries()) {
            registrations[eventType] = handlers.length;
        }
        return registrations;
    }
}

// ---------------------------------------------------------------------------
// Well-known domain event types
// ---------------------------------------------------------------------------

export const DomainEvents = {
    EVENT_PROCESSED: 'EVENT_PROCESSED',
    EVENT_FAILED: 'EVENT_FAILED',
    EVENT_RETRIED: 'EVENT_RETRIED',
    EVENT_DEAD_LETTERED: 'EVENT_DEAD_LETTERED',
    DEVICE_STATUS_CHANGED: 'DEVICE_STATUS_CHANGED',
    DEVICE_REGISTERED: 'DEVICE_REGISTERED',
    ALERT_TRIGGERED: 'ALERT_TRIGGERED',
    USER_LOGGED_IN: 'USER_LOGGED_IN',
    USER_ACCESS_DENIED: 'USER_ACCESS_DENIED',
} as const;

export type DomainEventType = (typeof DomainEvents)[keyof typeof DomainEvents];
