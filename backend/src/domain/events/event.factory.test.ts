import { describe, it, expect } from 'vitest';
import { parseIncomingEvent } from './event.factory.js';
import { EventType } from './event.types.js';

describe('parseIncomingEvent', () => {
    const validRaw = {
        eventUuid: '550e8400-e29b-41d4-a716-446655440001',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
        deviceUuid: '550e8400-e29b-41d4-a716-446655440003',
        eventType: 'DEVICE_CONNECTED',
        payload: { ip: '192.168.1.1' },
        timestamp: '2025-01-01T00:00:00.000Z',
    };

    it('should parse a valid raw object into IncomingEvent', () => {
        const result = parseIncomingEvent(validRaw);
        expect(result.eventUuid).toBe(validRaw.eventUuid);
        expect(result.idempotencyKey).toBe(validRaw.idempotencyKey);
        expect(result.deviceUuid).toBe(validRaw.deviceUuid);
        expect(result.eventType).toBe(EventType.DEVICE_CONNECTED);
        expect(result.payload).toEqual({ ip: '192.168.1.1' });
        expect(result.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should throw for null input', () => {
        expect(() => parseIncomingEvent(null)).toThrow('not an object');
    });

    it('should throw for non-object input', () => {
        expect(() => parseIncomingEvent('string')).toThrow('not an object');
    });

    it('should throw for missing eventUuid', () => {
        const { eventUuid: _, ...invalid } = validRaw;
        expect(() => parseIncomingEvent(invalid)).toThrow('eventUuid');
    });

    it('should throw for missing idempotencyKey', () => {
        const { idempotencyKey: _, ...invalid } = validRaw;
        expect(() => parseIncomingEvent(invalid)).toThrow('idempotencyKey');
    });

    it('should throw for missing deviceUuid', () => {
        const { deviceUuid: _, ...invalid } = validRaw;
        expect(() => parseIncomingEvent(invalid)).toThrow('deviceUuid');
    });

    it('should throw for unknown eventType', () => {
        expect(() => parseIncomingEvent({ ...validRaw, eventType: 'UNKNOWN' })).toThrow('eventType');
    });

    it('should throw for missing payload', () => {
        const { payload: _, ...invalid } = validRaw;
        expect(() => parseIncomingEvent(invalid)).toThrow('payload');
    });

    it('should default timestamp to ISO string when absent', () => {
        const { timestamp: _, ...noTs } = validRaw;
        const result = parseIncomingEvent(noTs);
        expect(result.timestamp).toBeTruthy();
        expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should accept all valid event types', () => {
        for (const eventType of Object.values(EventType)) {
            const result = parseIncomingEvent({ ...validRaw, eventType });
            expect(result.eventType).toBe(eventType);
        }
    });
});
