import { describe, it, expect, beforeEach } from 'vitest';
import { DevicePool } from './device-pool.js';
import type { DeviceStatus } from './device-pool.js';

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
                expect(device.status).toBe('REGISTERED' satisfies DeviceStatus);
            });
        });

        it('should assign unique UUIDs to each device', () => {
            pool.init(10);
            const uuids = pool.getAll().map((d) => d.deviceUuid);
            const uniqueUuids = new Set(uuids);
            expect(uniqueUuids.size).toBe(10);
        });
    });

    describe('transition', () => {
        it('should allow REGISTERED → ONLINE', () => {
            pool.init(1);
            const device = pool.getAll()[0];
            const ok = pool.transition(device, 'ONLINE');
            expect(ok).toBe(true);
            expect(device.status).toBe('ONLINE');
        });

        it('should reject invalid transitions', () => {
            pool.init(1);
            const device = pool.getAll()[0]; // REGISTERED
            const ok = pool.transition(device, 'OFFLINE');
            expect(ok).toBe(false);
            expect(device.status).toBe('REGISTERED'); // unchanged
        });
    });

    describe('getOnline', () => {
        it('should filter online devices', () => {
            pool.init(3);
            const devices = pool.getAll();
            pool.transition(devices[0], 'ONLINE');
            expect(pool.getOnline()).toHaveLength(1);
        });
    });

    describe('pickRandom', () => {
        it('should return a device when pool is not empty', () => {
            pool.init(3);
            const device = pool.pickRandom();
            expect(device).toBeDefined();
        });

        it('should return undefined when pool is empty', () => {
            pool.init(0);
            expect(pool.pickRandom()).toBeUndefined();
        });

        it('should filter by status', () => {
            pool.init(3);
            pool.transition(pool.getAll()[0], 'ONLINE');
            const online = pool.pickRandom('ONLINE');
            expect(online).toBeDefined();
            expect(online!.status).toBe('ONLINE');
        });
    });
});
