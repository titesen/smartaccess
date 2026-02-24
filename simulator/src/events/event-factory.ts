import crypto from 'node:crypto';
import type { SimulatedDevice } from '../devices/device-pool.js';

// ---------------------------------------------------------------------------
// Event envelope shared by all event types
// ---------------------------------------------------------------------------

export interface SimulatorEvent {
    eventUuid: string;
    idempotencyKey: string;
    deviceUuid: string;
    eventType: string;
    payload: Record<string, unknown>;
    timestamp: string; // ISO 8601 UTC
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number): number {
    return +(min + Math.random() * (max - min)).toFixed(2);
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createDeviceConnected(device: SimulatedDevice): SimulatorEvent {
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'DEVICE_CONNECTED',
        payload: {
            device_id: device.deviceUuid,
            name: device.name,
            firmware_version: device.firmwareVersion,
            timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
    };
}

export function createDeviceDisconnected(
    device: SimulatedDevice,
    reason: string = 'normal',
): SimulatorEvent {
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'DEVICE_DISCONNECTED',
        payload: {
            device_id: device.deviceUuid,
            reason,
            timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
    };
}

export function createTelemetryReported(device: SimulatedDevice): SimulatorEvent {
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'TELEMETRY_REPORTED',
        payload: {
            device_id: device.deviceUuid,
            metrics: {
                cpu: clamp(randomBetween(5, 95), 0, 100),
                memory: clamp(randomBetween(20, 90), 0, 100),
                temperature: clamp(randomBetween(18, 85), -40, 125),
            },
        },
        timestamp: new Date().toISOString(),
    };
}

export function createAlertTriggered(
    device: SimulatedDevice,
    metric: 'cpu' | 'memory' | 'temperature',
    value: number,
    threshold: number,
): SimulatorEvent {
    const severityMap: Record<string, string> = {
        cpu: value > 95 ? 'CRITICAL' : 'HIGH',
        memory: value > 95 ? 'CRITICAL' : 'HIGH',
        temperature: value > 80 ? 'CRITICAL' : value > 60 ? 'HIGH' : 'MEDIUM',
    };

    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'ALERT_TRIGGERED',
        payload: {
            device_id: device.deviceUuid,
            severity: severityMap[metric] || 'MEDIUM',
            metric,
            threshold,
            value,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createCommandReceived(
    device: SimulatedDevice,
    commandType: string,
): SimulatorEvent {
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'COMMAND_RECEIVED',
        payload: {
            device_id: device.deviceUuid,
            command_type: commandType,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createCommandExecuted(
    device: SimulatedDevice,
    commandType: string,
    result: 'SUCCESS' | 'FAILURE',
): SimulatorEvent {
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'COMMAND_EXECUTED',
        payload: {
            device_id: device.deviceUuid,
            command_type: commandType,
            result,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createMalformedEvent(device: SimulatedDevice): SimulatorEvent {
    // Generate a valid event shape so it passes initial DB parsing,
    // but signal the processing service to fail it explicitly for the DLQ.
    return {
        eventUuid: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        deviceUuid: device.deviceUuid,
        eventType: 'TELEMETRY_REPORTED',
        payload: {
            device_id: device.deviceUuid,
            metrics: { cpu: 999 },
            simulate_dlq: true,
            broken_data: true,
            reason: 'simulated_failure_to_trigger_dlq'
        },
        timestamp: new Date().toISOString(),
    };
}
