import { describe, it, expect } from 'vitest';
import { DeviceStatus } from '../device.types.js';
import { isValidTransition, getNewStatusForEvent } from '../device-state-machine.js';

describe('DeviceStateMachine', () => {
    describe('isValidTransition', () => {
        it('should allow REGISTERED → ONLINE', () => {
            expect(isValidTransition(DeviceStatus.REGISTERED, DeviceStatus.ONLINE)).toBe(true);
        });

        it('should allow ONLINE → OFFLINE', () => {
            expect(isValidTransition(DeviceStatus.ONLINE, DeviceStatus.OFFLINE)).toBe(true);
        });

        it('should allow ONLINE → ERROR', () => {
            expect(isValidTransition(DeviceStatus.ONLINE, DeviceStatus.ERROR)).toBe(true);
        });

        it('should allow ONLINE → MAINTENANCE', () => {
            expect(isValidTransition(DeviceStatus.ONLINE, DeviceStatus.MAINTENANCE)).toBe(true);
        });

        it('should allow OFFLINE → ONLINE', () => {
            expect(isValidTransition(DeviceStatus.OFFLINE, DeviceStatus.ONLINE)).toBe(true);
        });

        it('should allow ERROR → ONLINE', () => {
            expect(isValidTransition(DeviceStatus.ERROR, DeviceStatus.ONLINE)).toBe(true);
        });

        it('should allow MAINTENANCE → ONLINE', () => {
            expect(isValidTransition(DeviceStatus.MAINTENANCE, DeviceStatus.ONLINE)).toBe(true);
        });

        it('should NOT allow REGISTERED → OFFLINE', () => {
            expect(isValidTransition(DeviceStatus.REGISTERED, DeviceStatus.OFFLINE)).toBe(false);
        });

        it('should NOT allow DECOMMISSIONED → anything', () => {
            expect(isValidTransition(DeviceStatus.DECOMMISSIONED, DeviceStatus.ONLINE)).toBe(false);
            expect(isValidTransition(DeviceStatus.DECOMMISSIONED, DeviceStatus.REGISTERED)).toBe(false);
        });

        it('should NOT allow same-to-same transition', () => {
            expect(isValidTransition(DeviceStatus.ONLINE, DeviceStatus.ONLINE)).toBe(false);
        });

        it('should allow any state → DECOMMISSIONED (except from DECOMMISSIONED)', () => {
            expect(isValidTransition(DeviceStatus.ONLINE, DeviceStatus.DECOMMISSIONED)).toBe(true);
            expect(isValidTransition(DeviceStatus.OFFLINE, DeviceStatus.DECOMMISSIONED)).toBe(true);
            expect(isValidTransition(DeviceStatus.ERROR, DeviceStatus.DECOMMISSIONED)).toBe(true);
        });
    });

    describe('getNewStatusForEvent', () => {
        it('should return ONLINE for DEVICE_CONNECTED', () => {
            expect(getNewStatusForEvent('DEVICE_CONNECTED')).toBe(DeviceStatus.ONLINE);
        });

        it('should return OFFLINE for DEVICE_DISCONNECTED', () => {
            expect(getNewStatusForEvent('DEVICE_DISCONNECTED')).toBe(DeviceStatus.OFFLINE);
        });

        it('should return ERROR for ALERT_TRIGGERED', () => {
            expect(getNewStatusForEvent('ALERT_TRIGGERED')).toBe(DeviceStatus.ERROR);
        });

        it('should return null for TELEMETRY_REPORTED (no status change)', () => {
            expect(getNewStatusForEvent('TELEMETRY_REPORTED')).toBeNull();
        });

        it('should return null for unknown event types', () => {
            expect(getNewStatusForEvent('UNKNOWN_EVENT')).toBeNull();
        });
    });
});
