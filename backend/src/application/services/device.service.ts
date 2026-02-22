import { getPool } from '../../infrastructure/database/connection.js';
import type { IDeviceRepository } from '../../infrastructure/repositories/device.repository.js';
import type { ICacheAdapter } from '../../infrastructure/adapters/cache.adapter.js';
import type { Device } from '../../domain/devices/device.entity.js';
import type { DeviceStatus } from '../../domain/devices/device.types.js';
import { validateTransition } from '../../domain/devices/device-state-machine.js';

// ---------------------------------------------------------------------------
// DeviceService — read operations for the API layer
// ---------------------------------------------------------------------------

export class DeviceService {
    constructor(
        private readonly deviceRepo: IDeviceRepository,
        private readonly cacheAdapter: ICacheAdapter,
    ) { }

    async getAll(): Promise<Device[]> {
        const pool = getPool();
        const client = await pool.connect();
        try {
            return await this.deviceRepo.findAll(client);
        } finally {
            client.release();
        }
    }

    async getByUuid(uuid: string): Promise<Device | null> {
        // Try cache first
        const cached = await this.cacheAdapter.get(`device:${uuid}`);
        if (cached) {
            try {
                return JSON.parse(cached) as Device;
            } catch {
                // cache corrupted — fall through to DB
            }
        }

        const pool = getPool();
        const client = await pool.connect();
        try {
            const device = await this.deviceRepo.findByUuid(client, uuid);
            if (device) {
                await this.cacheAdapter.set(`device:${uuid}`, JSON.stringify(device), 300);
            }
            return device;
        } finally {
            client.release();
        }
    }

    async updateStatus(uuid: string, newStatus: DeviceStatus): Promise<Device | null> {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const device = await this.deviceRepo.findByUuid(client, uuid);
            if (!device) return null;

            // Validate transition (throws if invalid)
            validateTransition(device.status, newStatus);

            const updated = await this.deviceRepo.updateStatus(client, device.id, newStatus);
            if (updated) {
                await this.cacheAdapter.set(`device:${uuid}`, JSON.stringify(updated), 300);
            }
            return updated;
        } finally {
            client.release();
        }
    }
}
