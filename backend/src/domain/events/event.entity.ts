import { EventType, EventProcessingStatus } from './event.types.js';

export interface DomainEvent {
    id: number;
    eventUuid: string;
    deviceId: number;
    eventType: EventType;
    payload: Record<string, unknown>;
    receivedAt: Date;
    processingStatus: EventProcessingStatus;
    retryCount: number;
    idempotencyKey: string;
    createdAt: Date;
}
