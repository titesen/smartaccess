import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../../shared/logger/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { DlqService } from '../dlq.service.js';
import type { IEventRepository } from '../../../infrastructure/repositories/event.repository.js';
import type { IAuditRepository } from '../../../infrastructure/repositories/audit.repository.js';
import { EventProcessingStatus } from '../../../domain/events/event.types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient() {
    return {
        query: vi.fn(),
        release: vi.fn(),
    } as any;
}

function createMockEventRepo(): IEventRepository {
    return {
        updateProcessingStatus: vi.fn(),
        findByUuid: vi.fn(),
        create: vi.fn(),
        findAll: vi.fn(),
    } as unknown as IEventRepository;
}

function createMockAuditRepo(): IAuditRepository {
    return {
        create: vi.fn(),
    } as unknown as IAuditRepository;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DlqService', () => {
    let eventRepo: IEventRepository;
    let auditRepo: IAuditRepository;
    let dlqService: DlqService;
    let client: ReturnType<typeof createMockClient>;

    beforeEach(() => {
        vi.clearAllMocks();
        eventRepo = createMockEventRepo();
        auditRepo = createMockAuditRepo();
        dlqService = new DlqService(eventRepo, auditRepo);
        client = createMockClient();
    });

    describe('moveToDeadLetter', () => {
        it('should insert event into dead_letter_events table', async () => {
            client.query
                // 1st call: SELECT event
                .mockResolvedValueOnce({
                    rows: [{ event_uuid: 'evt-001', payload: { temp: 99 } }],
                })
                // 2nd call: INSERT into dead_letter_events
                .mockResolvedValueOnce({ rows: [] });

            await dlqService.moveToDeadLetter(client, 42, 'Max retries exceeded');

            // Verify INSERT was called
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO dead_letter_events'),
                [42, JSON.stringify({ temp: 99 }), 'Max retries exceeded'],
            );
        });

        it('should update event status to DEAD_LETTERED', async () => {
            client.query
                .mockResolvedValueOnce({
                    rows: [{ event_uuid: 'evt-002', payload: {} }],
                })
                .mockResolvedValueOnce({ rows: [] });

            await dlqService.moveToDeadLetter(client, 10, 'Timeout');

            expect(eventRepo.updateProcessingStatus).toHaveBeenCalledWith(
                client,
                10,
                EventProcessingStatus.DEAD_LETTERED,
            );
        });

        it('should create an audit log entry with category TECHNICAL', async () => {
            client.query
                .mockResolvedValueOnce({
                    rows: [{ event_uuid: 'evt-003', payload: { x: 1 } }],
                })
                .mockResolvedValueOnce({ rows: [] });

            await dlqService.moveToDeadLetter(client, 5, 'Parse error');

            expect(auditRepo.create).toHaveBeenCalledWith(
                client,
                expect.objectContaining({
                    eventType: 'EVENT_DEAD_LETTERED',
                    category: 'TECHNICAL',
                    aggregateType: 'EVENT',
                    aggregateId: 'evt-003',
                    actor: 'SYSTEM',
                    result: 'FAILURE',
                }),
            );
        });

        it('should do nothing if event is not found in database', async () => {
            client.query.mockResolvedValueOnce({ rows: [] }); // No event found

            await dlqService.moveToDeadLetter(client, 999, 'Not found');

            // No INSERT should have been called
            expect(client.query).toHaveBeenCalledTimes(1); // Only the SELECT
            expect(eventRepo.updateProcessingStatus).not.toHaveBeenCalled();
            expect(auditRepo.create).not.toHaveBeenCalled();
        });
    });
});
