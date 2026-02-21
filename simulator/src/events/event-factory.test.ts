import { describe, it, expect } from 'vitest';
import { DeviceStatus } from '../devices/device-pool.js';
import {
    createDeviceConnected,
    createDeviceDisconnected,
    createTelemetryReported,
    createAlertTriggered,
} from '../events/event-factory.js';

describe('EventFactory', () => {
    const device = {
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'SIM-001',
        status: DeviceStatus.ONLINE,
        firmware: '1.0.0',
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
            expect(event.payload).toHaveProperty('temperature');
            expect(event.payload).toHaveProperty('humidity');
            expect(event.payload).toHaveProperty('battery');
        });

        it('should generate realistic metric ranges', () => {
            const event = createTelemetryReported(device);
            const { temperature, humidity, battery } = event.payload as {
                temperature: number;
                humidity: number;
                battery: number;
            };
            expect(temperature).toBeGreaterThanOrEqual(15);
            expect(temperature).toBeLessThanOrEqual(45);
            expect(humidity).toBeGreaterThanOrEqual(20);
            expect(humidity).toBeLessThanOrEqual(90);
            expect(battery).toBeGreaterThanOrEqual(0);
            expect(battery).toBeLessThanOrEqual(100);
        });
    });

    describe('createAlertTriggered', () => {
        it('should create an ALERT_TRIGGERED event', () => {
            const event = createAlertTriggered(device);
            expect(event.eventType).toBe('ALERT_TRIGGERED');
            expect(event.payload).toHaveProperty('alertType');
            expect(event.payload).toHaveProperty('severity');
        });
    });
});
