import { describe, it, expect } from 'vitest';
import { EventPayloadBuilder } from '../../domain/events/event-payload.builder.js';

describe('EventPayloadBuilder', () => {
    it('should build a valid payload with all required fields', () => {
        const payload = new EventPayloadBuilder('TELEMETRY_REPORTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withMetric('cpu_usage', 75.5)
            .build();

        expect(payload.eventType).toBe('TELEMETRY_REPORTED');
        expect(payload.deviceUuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(payload.metrics).toEqual({ cpu_usage: 75.5 });
        expect(payload.timestamp).toBeDefined();
    });

    it('should support multiple metrics via withMetrics()', () => {
        const payload = new EventPayloadBuilder('TELEMETRY_REPORTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withMetrics({ cpu: 50, memory: 70, disk: 30 })
            .build();

        expect(payload.metrics).toEqual({ cpu: 50, memory: 70, disk: 30 });
    });

    it('should support metadata', () => {
        const payload = new EventPayloadBuilder('DEVICE_CONNECTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withMetadata('firmware', '2.0.0')
            .withMetadata('source', 'mqtt')
            .build();

        expect(payload.metadata).toEqual({ firmware: '2.0.0', source: 'mqtt' });
    });

    it('should support severity and correlationId', () => {
        const payload = new EventPayloadBuilder('ALERT_TRIGGERED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withSeverity('critical')
            .withCorrelationId('corr-001')
            .build();

        expect(payload.severity).toBe('critical');
        expect(payload.correlationId).toBe('corr-001');
    });

    it('should allow custom timestamp', () => {
        const ts = '2025-01-15T10:30:00.000Z';
        const payload = new EventPayloadBuilder('TELEMETRY_REPORTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withTimestamp(ts)
            .build();

        expect(payload.timestamp).toBe(ts);
    });

    it('should accept Date object for timestamp', () => {
        const date = new Date('2025-06-01T12:00:00Z');
        const payload = new EventPayloadBuilder('TELEMETRY_REPORTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withTimestamp(date)
            .build();

        expect(payload.timestamp).toBe(date.toISOString());
    });

    it('should throw if deviceUuid is missing', () => {
        expect(() =>
            new EventPayloadBuilder('TELEMETRY_REPORTED').build()
        ).toThrow('deviceUuid is required');
    });

    it('should be chainable (fluent API)', () => {
        const builder = new EventPayloadBuilder('TELEMETRY_REPORTED');
        const result = builder
            .withDevice('id')
            .withMetric('cpu', 1)
            .withMetadata('k', 'v')
            .withSeverity('low')
            .withCorrelationId('c');

        // Should return same builder instance
        expect(result).toBe(builder);
    });

    it('should produce immutable copies in metrics/metadata', () => {
        const builder = new EventPayloadBuilder('TELEMETRY_REPORTED')
            .withDevice('550e8400-e29b-41d4-a716-446655440000')
            .withMetric('cpu', 50);

        const payload1 = builder.build();
        const payload2 = builder.withMetric('memory', 90).build();

        // payload1 should not have memory
        expect(payload1.metrics).toEqual({ cpu: 50 });
        // payload2 should have both
        expect(payload2.metrics).toEqual({ cpu: 50, memory: 90 });
    });
});
