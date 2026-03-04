import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../shared/logger/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockClient = { query: vi.fn(), release: vi.fn() };
const mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };
vi.mock('../../../infrastructure/database/connection.js', () => ({
    getPool: () => mockPool,
}));

// Mock the state machine — use vi.hoisted() because vi.mock() factories are hoisted
const { mockValidateTransition } = vi.hoisted(() => ({
    mockValidateTransition: vi.fn(),
}));
vi.mock('../../../domain/devices/device-state-machine.js', () => ({
    validateTransition: mockValidateTransition,
}));

import { DeviceService } from '../device.service.js';
import type { IDeviceRepository } from '../../../infrastructure/repositories/device.repository.js';
import type { ICacheAdapter } from '../../../infrastructure/adapters/cache.adapter.js';
import { DeviceStatus } from '../../../domain/devices/device.types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleDevice = {
    id: 1,
    deviceUuid: 'abc-123',
    name: 'Sensor-01',
    location: 'Office',
    status: DeviceStatus.ONLINE,
    firmwareVersion: '1.0.0',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
};

function createMockRepo(): IDeviceRepository {
    return {
        findAll: vi.fn().mockResolvedValue([sampleDevice]),
        findByUuid: vi.fn().mockResolvedValue(sampleDevice),
        updateStatus: vi.fn().mockResolvedValue({ ...sampleDevice, status: DeviceStatus.OFFLINE }),
        findById: vi.fn(),
        create: vi.fn(),
    } as unknown as IDeviceRepository;
}

function createMockCache(): ICacheAdapter {
    return {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
    } as unknown as ICacheAdapter;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeviceService', () => {
    let repo: IDeviceRepository;
    let cache: ICacheAdapter;
    let service: DeviceService;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = createMockRepo();
        cache = createMockCache();
        service = new DeviceService(repo, cache);
    });

    // -----------------------------------------------------------------------
    // getAll
    // -----------------------------------------------------------------------

    describe('getAll', () => {
        it('should delegate to repo.findAll and return the list', async () => {
            const result = await service.getAll();
            expect(result).toEqual([sampleDevice]);
            expect(repo.findAll).toHaveBeenCalledOnce();
        });
    });

    // -----------------------------------------------------------------------
    // getByUuid
    // -----------------------------------------------------------------------

    describe('getByUuid', () => {
        it('should return from cache if available', async () => {
            vi.mocked(cache.get).mockResolvedValue(JSON.stringify(sampleDevice));

            const result = await service.getByUuid('abc-123');

            // JSON.parse turns Date into ISO strings, so check key props
            expect(result).toMatchObject({
                id: sampleDevice.id,
                deviceUuid: sampleDevice.deviceUuid,
                status: sampleDevice.status,
            });
            expect(repo.findByUuid).not.toHaveBeenCalled();
        });

        it('should query DB on cache miss and cache the result', async () => {
            vi.mocked(cache.get).mockResolvedValue(null);

            const result = await service.getByUuid('abc-123');

            expect(result).toEqual(sampleDevice);
            expect(repo.findByUuid).toHaveBeenCalledWith(mockClient, 'abc-123');
            expect(cache.set).toHaveBeenCalledWith(
                'device:abc-123',
                JSON.stringify(sampleDevice),
                300,
            );
        });

        it('should return null if device not found in DB', async () => {
            vi.mocked(cache.get).mockResolvedValue(null);
            vi.mocked(repo.findByUuid).mockResolvedValue(null);

            const result = await service.getByUuid('nonexistent');
            expect(result).toBeNull();
        });

        it('should fall through to DB if cached JSON is corrupt', async () => {
            vi.mocked(cache.get).mockResolvedValue('not-valid-json{{{');

            const result = await service.getByUuid('abc-123');
            expect(result).toEqual(sampleDevice);
            expect(repo.findByUuid).toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // updateStatus
    // -----------------------------------------------------------------------

    describe('updateStatus', () => {
        it('should validate transition and update status', async () => {
            mockValidateTransition.mockReturnValue(undefined);

            const result = await service.updateStatus('abc-123', DeviceStatus.OFFLINE);

            expect(mockValidateTransition).toHaveBeenCalledWith(DeviceStatus.ONLINE, DeviceStatus.OFFLINE);
            expect(repo.updateStatus).toHaveBeenCalledWith(mockClient, 1, DeviceStatus.OFFLINE);
            expect(result).toBeTruthy();
        });

        it('should return null if device not found', async () => {
            vi.mocked(repo.findByUuid).mockResolvedValue(null);

            const result = await service.updateStatus('ghost', DeviceStatus.OFFLINE);
            expect(result).toBeNull();
            expect(mockValidateTransition).not.toHaveBeenCalled();
        });

        it('should throw if transition is invalid', async () => {
            mockValidateTransition.mockImplementation(() => {
                throw new Error('Invalid transition');
            });

            await expect(
                service.updateStatus('abc-123', DeviceStatus.REGISTERED),
            ).rejects.toThrow('Invalid transition');
        });

        it('should update cache after successful status change', async () => {
            mockValidateTransition.mockReturnValue(undefined);

            await service.updateStatus('abc-123', DeviceStatus.OFFLINE);

            expect(cache.set).toHaveBeenCalledWith(
                'device:abc-123',
                expect.any(String),
                300,
            );
        });
    });
});
