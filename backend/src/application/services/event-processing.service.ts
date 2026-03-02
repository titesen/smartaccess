import type pg from 'pg';
import { logger } from '../../shared/logger/logger.js';
import { UnitOfWork } from '../../infrastructure/database/unit-of-work.js';
import type { IDeviceRepository } from '../../infrastructure/repositories/device.repository.js';
import type { IEventRepository } from '../../infrastructure/repositories/event.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import type { IEventProcessingLogRepository } from '../../infrastructure/repositories/event-processing-log.repository.js';
import type { ICacheAdapter } from '../../infrastructure/adapters/cache.adapter.js';
import type { IncomingEvent } from '../../domain/events/event.factory.js';
import { statusFromEventType, isValidTransition } from '../../domain/devices/device-state-machine.js';
import { EventProcessingStatus } from '../../domain/events/event.types.js';
import type { Device } from '../../domain/devices/device.entity.js';
import type { WebSocketGateway } from '../../infrastructure/websocket/ws-gateway.js';
import type { DlqService } from './dlq.service.js';
import type { AlertService } from './alert.service.js';

// ---------------------------------------------------------------------------
// EventProcessingService
// ---------------------------------------------------------------------------

export class EventProcessingService {
    constructor(
        private readonly deviceRepo: IDeviceRepository,
        private readonly eventRepo: IEventRepository,
        private readonly auditRepo: IAuditRepository,
        private readonly processingLogRepo: IEventProcessingLogRepository,
        private readonly cacheAdapter: ICacheAdapter,
        private readonly wsGateway: WebSocketGateway,
        private readonly dlqService: DlqService,
        private readonly alertService: AlertService,
    ) { }

    /**
     * Process a single incoming event inside a transaction.
     * Returns true if the event was processed, false if it was a duplicate.
     */
    async process(event: IncomingEvent): Promise<boolean> {
        const startTime = Date.now();
        const uow = new UnitOfWork();

        try {
            const result = await uow.execute(async (client) => {
                // 1. Idempotency check (BR-IDP-001)
                const existing = await this.eventRepo.findByIdempotencyKey(
                    client,
                    event.idempotencyKey,
                );
                if (existing) {
                    // BR-IDP-002 — log to audit
                    await this.auditRepo.create(client, {
                        eventType: 'EVENT_DUPLICATE_DETECTED',
                        category: 'DOMAIN',
                        aggregateType: 'EVENT',
                        aggregateId: event.eventUuid,
                        newState: { idempotencyKey: event.idempotencyKey },
                        actor: 'SYSTEM',
                        correlationId: event.eventUuid,
                        result: 'SUCCESS',
                    });

                    logger.info('Duplicate event detected — skipping', {
                        eventUuid: event.eventUuid,
                        idempotencyKey: event.idempotencyKey,
                    });
                    return false;
                }

                // 2. Find or create device
                let device = await this.findOrCreateDevice(client, event);

                // 3. Persist event
                const persistedEvent = await this.eventRepo.create(client, {
                    eventUuid: event.eventUuid,
                    deviceId: device.id,
                    eventType: event.eventType,
                    payload: event.payload,
                    idempotencyKey: event.idempotencyKey,
                });

                await this.processingLogRepo.create(
                    client,
                    persistedEvent.id,
                    'RECEIVED',
                    'SUCCESS',
                    'Event persisted',
                );

                // --- NEW DLQ DEMO LOGIC ---
                // If the simulator explicitly flags this event as a simulated failure
                if ((event.payload).simulate_dlq === true) {
                    logger.error('Simulating unrecoverable processing failure for DLQ', {
                        eventUuid: event.eventUuid
                    });
                    await this.dlqService.moveToDeadLetter(client, persistedEvent.id, 'simulated_failure_to_trigger_dlq');
                    return true; // We return true so the DB transaction commits saving the DLQ entry
                }

                if (event.eventType === 'ALERT_TRIGGERED') {
                    const payload = event.payload;
                    const severityRaw = String(payload.severity ?? 'info').toLowerCase();
                    const severity = severityRaw as import('./alert.service.js').AlertSeverity;
                    await this.alertService.createAlert({
                        deviceId: device.id,
                        deviceUuid: device.deviceUuid,
                        metric: String(payload.metric),
                        value: Number(payload.value),
                        threshold: Number(payload.threshold),
                        severity,
                    }, persistedEvent.id);
                }

                // 4. Update device status if applicable
                const newStatus = statusFromEventType(event.eventType);
                if (newStatus && isValidTransition(device.status, newStatus)) {
                    const previousStatus = device.status;
                    device = (await this.deviceRepo.updateStatus(
                        client,
                        device.id,
                        newStatus,
                    ))!;

                    await this.auditRepo.create(client, {
                        eventType: 'DEVICE_STATUS_CHANGED',
                        category: 'DOMAIN',
                        aggregateType: 'DEVICE',
                        aggregateId: device.deviceUuid,
                        previousState: { status: previousStatus },
                        newState: { status: newStatus },
                        actor: 'SYSTEM',
                        correlationId: event.eventUuid,
                        result: 'SUCCESS',
                    });
                }

                // 5. Update last_seen_at
                await this.deviceRepo.updateLastSeen(client, device.id);

                // 6. Mark event as PROCESSED
                await this.eventRepo.updateProcessingStatus(
                    client,
                    persistedEvent.id,
                    EventProcessingStatus.PROCESSED,
                );

                await this.processingLogRepo.create(
                    client,
                    persistedEvent.id,
                    'PROCESSED',
                    'SUCCESS',
                    'Event fully processed',
                );

                // 7. Audit — event processed
                await this.auditRepo.create(client, {
                    eventType: 'EVENT_PROCESSED',
                    category: 'DOMAIN',
                    aggregateType: 'EVENT',
                    aggregateId: event.eventUuid,
                    newState: { eventType: event.eventType, deviceUuid: event.deviceUuid },
                    actor: 'SYSTEM',
                    correlationId: event.eventUuid,
                    result: 'SUCCESS',
                });

                // 8. Update device cache
                await this.cacheAdapter.set(
                    `device:${device.deviceUuid}`,
                    JSON.stringify(device),
                    300, // 5min TTL
                );

                // 9. Broadcast event via WebSocket
                this.wsGateway.broadcast(event.eventType, {
                    eventUuid: event.eventUuid,
                    deviceId: device.deviceUuid,
                    eventType: event.eventType,
                    payload: event.payload,
                    timestamp: new Date().toISOString(),
                });

                return true;
            });

            const durationMs = Date.now() - startTime;
            logger.info('Event processing complete', {
                eventUuid: event.eventUuid,
                eventType: event.eventType,
                deviceUuid: event.deviceUuid,
                processed: result,
                durationMs,
            });

            return result;
        } catch (err) {
            const durationMs = Date.now() - startTime;
            logger.error('Event processing failed', {
                eventUuid: event.eventUuid,
                eventType: event.eventType,
                error: err instanceof Error ? err.message : String(err),
                durationMs,
            });
            throw err;
        }
    }

    // -----------------------------------------------------------------------
    // Internal — find device by UUID or auto-register it
    // -----------------------------------------------------------------------

    private async findOrCreateDevice(
        client: pg.PoolClient,
        event: IncomingEvent,
    ): Promise<Device> {
        let device = await this.deviceRepo.findByUuid(client, event.deviceUuid);
        if (device) return device;

        // Auto-register device if it doesn't exist
        const payload = event.payload;
        device = await this.deviceRepo.create(client, {
            deviceUuid: event.deviceUuid,
            name: (payload.name as string) || `device-${event.deviceUuid.slice(0, 8)}`,
            ...(payload.location ? { location: payload.location as string } : {}),
            ...(payload.firmware_version ? { firmwareVersion: payload.firmware_version as string } : {}),
        });

        await this.auditRepo.create(client, {
            eventType: 'DEVICE_AUTO_REGISTERED',
            category: 'DOMAIN',
            aggregateType: 'DEVICE',
            aggregateId: device.deviceUuid,
            newState: { name: device.name, status: device.status },
            actor: 'SYSTEM',
            correlationId: event.eventUuid,
            result: 'SUCCESS',
        });

        logger.info('Device auto-registered', {
            deviceUuid: device.deviceUuid,
            name: device.name,
        });

        return device;
    }
}
