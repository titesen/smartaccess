import { describe, it, expect } from 'vitest';
import type { SimulatedDevice } from '../devices/device-pool.js';
import {
    createDeviceConnected,
    createDeviceDisconnected,
    createTelemetryReported,
    createAlertTriggered,
} from './event-factory.js';

describe('EventFactory', () => {
    const device: SimulatedDevice = {
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'sensor-001',
        location: 'Building A – Floor 1',
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
    };

    describe('createDeviceConnected', () => {
        it('should create a DEVICE_CONNECTED event', () => {
            const event = createDeviceConnected(device);
            expect(event.eventType).toBe('DEVICE_CONNECTED');
            expect(event.deviceUuid).toBe(device.deviceUuid);
            expect(event.eventUuid).toBeTruthy();
            expect(event.idempotencyKey).toBeTruthy();
            expect(event.eventUuid).not.toBe(event.idempotencyKey);
        });
    });

    describe('createDeviceDisconnected', () => {
        it('should create a DEVICE_DISCONNECTED event', () => {
            const event = createDeviceDisconnected(device);
            expect(event.eventType).toBe('DEVICE_DISCONNECTED');
            expect(event.payload).toHaveProperty('reason');
        });
    });

    describe('createTelemetryReported', () => {
        it('should create a TELEMETRY_REPORTED event with metrics', () => {
            const event = createTelemetryReported(device);
            expect(event.eventType).toBe('TELEMETRY_REPORTED');
            expect(event.payload).toHaveProperty('metrics');
            const metrics = event.payload.metrics as Record<string, number>;
            expect(metrics).toHaveProperty('cpu');
            expect(metrics).toHaveProperty('memory');
            expect(metrics).toHaveProperty('temperature');
        });

        it('should generate realistic metric ranges', () => {
            const event = createTelemetryReported(device);
            const metrics = event.payload.metrics as Record<string, number>;
            expect(metrics.cpu).toBeGreaterThanOrEqual(0);
            expect(metrics.cpu).toBeLessThanOrEqual(100);
            expect(metrics.memory).toBeGreaterThanOrEqual(0);
            expect(metrics.memory).toBeLessThanOrEqual(100);
            expect(metrics.temperature).toBeGreaterThanOrEqual(-40);
            expect(metrics.temperature).toBeLessThanOrEqual(125);
        });
    });

    describe('createAlertTriggered', () => {
        it('should create an ALERT_TRIGGERED event', () => {
            const event = createAlertTriggered(device, 'cpu', 92, 85);
            expect(event.eventType).toBe('ALERT_TRIGGERED');
            expect(event.payload).toHaveProperty('severity');
            expect(event.payload).toHaveProperty('metric');
            expect(event.payload.metric).toBe('cpu');
            expect(event.payload.value).toBe(92);
            expect(event.payload.threshold).toBe(85);
        });

        it('should assign CRITICAL severity for extreme values', () => {
            const event = createAlertTriggered(device, 'cpu', 98, 85);
            expect(event.payload.severity).toBe('CRITICAL');
        });
    });
});
