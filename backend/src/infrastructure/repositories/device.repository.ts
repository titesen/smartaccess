import type pg from 'pg';
import type { Device } from '../../domain/devices/device.entity.js';
import type { DeviceStatus } from '../../domain/devices/device.types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IDeviceRepository {
    findByUuid(client: pg.PoolClient, deviceUuid: string): Promise<Device | null>;
    findById(client: pg.PoolClient, id: number): Promise<Device | null>;
    findAll(client: pg.PoolClient): Promise<Device[]>;
    create(client: pg.PoolClient, data: CreateDeviceDto): Promise<Device>;
    updateStatus(client: pg.PoolClient, id: number, status: DeviceStatus): Promise<Device | null>;
    updateLastSeen(client: pg.PoolClient, id: number): Promise<void>;
}

export interface CreateDeviceDto {
    deviceUuid: string;
    name: string;
    location?: string;
    firmwareVersion?: string;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgDeviceRepository implements IDeviceRepository {
    async findByUuid(client: pg.PoolClient, deviceUuid: string): Promise<Device | null> {
        const { rows } = await client.query(
            `SELECT id, device_uuid, name, location, status, firmware_version, last_seen_at, created_at, updated_at
             FROM devices WHERE device_uuid = $1`,
            [deviceUuid],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findById(client: pg.PoolClient, id: number): Promise<Device | null> {
        const { rows } = await client.query(
            `SELECT id, device_uuid, name, location, status, firmware_version, last_seen_at, created_at, updated_at
             FROM devices WHERE id = $1`,
            [id],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findAll(client: pg.PoolClient): Promise<Device[]> {
        const { rows } = await client.query(
            `SELECT id, device_uuid, name, location, status, firmware_version, last_seen_at, created_at, updated_at
             FROM devices ORDER BY id`,
        );
        return rows.map(this.mapRow);
    }

    async create(client: pg.PoolClient, data: CreateDeviceDto): Promise<Device> {
        const { rows } = await client.query(
            `INSERT INTO devices (device_uuid, name, location, firmware_version)
             VALUES ($1, $2, $3, $4)
             RETURNING id, device_uuid, name, location, status, firmware_version, last_seen_at, created_at, updated_at`,
            [data.deviceUuid, data.name, data.location ?? null, data.firmwareVersion ?? null],
        );
        return this.mapRow(rows[0]);
    }

    async updateStatus(
        client: pg.PoolClient,
        id: number,
        status: DeviceStatus,
    ): Promise<Device | null> {
        const { rows } = await client.query(
            `UPDATE devices SET status = $2 WHERE id = $1
             RETURNING id, device_uuid, name, location, status, firmware_version, last_seen_at, created_at, updated_at`,
            [id, status],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async updateLastSeen(client: pg.PoolClient, id: number): Promise<void> {
        await client.query(`UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`, [
            id,
        ]);
    }

    // -----------------------------------------------------------------------
    // Row mapper
    // -----------------------------------------------------------------------

    private mapRow(row: Record<string, unknown>): Device {
        return {
            id: row.id as number,
            deviceUuid: row.device_uuid as string,
            name: row.name as string,
            location: (row.location as string) ?? null,
            status: row.status as DeviceStatus,
            firmwareVersion: (row.firmware_version as string) ?? null,
            lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at as string) : null,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
        };
    }
}
