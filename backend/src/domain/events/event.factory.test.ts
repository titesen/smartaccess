import { describe, it, expect } from 'vitest';
import { EventFactory, type IncomingEvent } from '../event.factory.js';

describe('EventFactory', () => {
    const validMessage = {
        content: Buffer.from(
            JSON.stringify({
                eventUuid: '550e8400-e29b-41d4-a716-446655440001',
                idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
                deviceUuid: '550e8400-e29b-41d4-a716-446655440003',
                eventType: 'DEVICE_CONNECTED',
                payload: { ip: '192.168.1.1' },
                timestamp: '2025-01-01T00:00:00.000Z',
            }),
        ),
    };

    describe('parse', () => {
        it('should parse a valid message', () => {
            const result = EventFactory.parse(validMessage as never);
            expect(result).not.toBeNull();
            expect((result as IncomingEvent).eventType).toBe('DEVICE_CONNECTED');
            expect((result as IncomingEvent).deviceUuid).toBe('550e8400-e29b-41d4-a716-446655440003');
        });

        it('should return null for invalid JSON', () => {
            const msg = { content: Buffer.from('not json') };
            expect(EventFactory.parse(msg as never)).toBeNull();
        });

        it('should return null for missing required fields', () => {
            const msg = {
                content: Buffer.from(JSON.stringify({ eventUuid: 'abc' })),
            };
            expect(EventFactory.parse(msg as never)).toBeNull();
        });

        it('should return null for invalid event type', () => {
            const msg = {
                content: Buffer.from(
                    JSON.stringify({
                        eventUuid: '550e8400-e29b-41d4-a716-446655440001',
                        idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
                        deviceUuid: '550e8400-e29b-41d4-a716-446655440003',
                        eventType: 'INVALID_TYPE',
                        payload: {},
                        timestamp: '2025-01-01T00:00:00.000Z',
                    }),
                ),
            };
            expect(EventFactory.parse(msg as never)).toBeNull();
        });

        it('should return null when content is null', () => {
            const msg = { content: null };
            expect(EventFactory.parse(msg as never)).toBeNull();
        });
    });
});
