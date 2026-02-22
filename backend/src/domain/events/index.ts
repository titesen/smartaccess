// ---------------------------------------------------------------------------
// Domain / Events — barrel export
// ---------------------------------------------------------------------------

export type { DomainEvent } from './event.entity.js';
export type { IncomingEvent } from './event.factory.js';
export { parseIncomingEvent } from './event.factory.js';
export { EventObserver, DomainEvents } from './event.observer.js';
export type { DomainEventType } from './event.observer.js';
export { EventPayloadBuilder } from './event-payload.builder.js';
export { EventType, EventProcessingStatus, AckStatus } from './event.types.js';
