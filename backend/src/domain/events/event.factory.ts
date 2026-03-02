import { EventType } from './event.types.js';

// ---------------------------------------------------------------------------
// Incoming event DTO (from broker message deserialization)
// ---------------------------------------------------------------------------

export interface IncomingEvent {
    eventUuid: string;
    idempotencyKey: string;
    deviceUuid: string;
    eventType: EventType;
    payload: Record<string, unknown>;
    timestamp: string;
}

// ---------------------------------------------------------------------------
// Factory — parse incoming broker message to IncomingEvent
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = new Set<string>(Object.values(EventType));

export function parseIncomingEvent(raw: unknown): IncomingEvent {
    if (typeof raw !== 'object' || raw === null) {
        throw new Error('Invalid event: not an object');
    }

    const obj = raw as Record<string, unknown>;

    if (!obj.eventUuid || typeof obj.eventUuid !== 'string') {
        throw new Error('Invalid event: missing or invalid eventUuid');
    }
    if (!obj.idempotencyKey || typeof obj.idempotencyKey !== 'string') {
        throw new Error('Invalid event: missing or invalid idempotencyKey');
    }
    if (!obj.deviceUuid || typeof obj.deviceUuid !== 'string') {
        throw new Error('Invalid event: missing or invalid deviceUuid');
    }
    if (!obj.eventType || !VALID_EVENT_TYPES.has(obj.eventType as string)) {
        throw new Error(`Invalid event: unknown eventType "${obj.eventType}"`);
    }
    if (!obj.payload || typeof obj.payload !== 'object') {
        throw new Error('Invalid event: missing or invalid payload');
    }

    return {
        eventUuid: obj.eventUuid,
        idempotencyKey: obj.idempotencyKey,
        deviceUuid: obj.deviceUuid,
        eventType: obj.eventType as EventType,
        payload: obj.payload as Record<string, unknown>,
        timestamp: (obj.timestamp as string) || new Date().toISOString(),
    };
}
