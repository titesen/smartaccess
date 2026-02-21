import { describe, it, expect } from 'vitest';
import { DevicePool, DeviceStatus } from '../device-pool.js';

describe('DevicePool', () => {
    let pool: DevicePool;

    beforeEach(() => {
        pool = new DevicePool();
    });

    describe('init', () => {
        it('should create the specified number of devices', () => {
            pool.init(5);
            expect(pool.getAll()).toHaveLength(5);
        });

        it('should initialize all devices as REGISTERED', () => {
            pool.init(3);
            pool.getAll().forEach((device) => {
                expect(device.status).toBe(DeviceStatus.REGISTERED);
            });
        });

        it('should assign unique UUIDs to each device', () => {
            pool.init(10);
            const uuids = pool.getAll().map((d) => d.deviceUuid);
            const uniqueUuids = new Set(uuids);
            expect(uniqueUuids.size).toBe(10);
        });

        it('should assign sequential names', () => {
            pool.init(3);
            const names = pool.getAll().map((d) => d.name);
            expect(names).toEqual(['SIM-001', 'SIM-002', 'SIM-003']);
        });
    });

    describe('transition', () => {
        it('should allow REGISTERED → ONLINE', () => {
            pool.init(1);
            const device = pool.getAll()[0];
            const ok = pool.transition(device, DeviceStatus.ONLINE);
            expect(ok).toBe(true);
            expect(device.status).toBe(DeviceStatus.ONLINE);
        });

        it('should reject invalid transitions', () => {
            pool.init(1);
            const device = pool.getAll()[0]; // REGISTERED
            const ok = pool.transition(device, DeviceStatus.OFFLINE);
            expect(ok).toBe(false);
            expect(device.status).toBe(DeviceStatus.REGISTERED); // unchanged
        });
    });

    describe('getByStatus', () => {
        it('should filter devices by status', () => {
            pool.init(3);
            const devices = pool.getAll();

            // Transition first device to ONLINE
            pool.transition(devices[0], DeviceStatus.ONLINE);

            expect(pool.getByStatus(DeviceStatus.ONLINE)).toHaveLength(1);
            expect(pool.getByStatus(DeviceStatus.REGISTERED)).toHaveLength(2);
        });
    });

    describe('getRandom', () => {
        it('should return a device when pool is not empty', () => {
            pool.init(3);
            const device = pool.getRandom();
            expect(device).toBeDefined();
        });

        it('should return undefined when pool is empty', () => {
            pool.init(0);
            expect(pool.getRandom()).toBeUndefined();
        });
    });
});
