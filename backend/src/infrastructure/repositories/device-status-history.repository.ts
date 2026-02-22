import { Pool, PoolClient } from 'pg';
import { getPool } from '../database/connection.js';

interface StatusHistoryRow {
    id: number;
    device_id: number;
    previous_status: string;
    new_status: string;
    changed_at: Date;
    changed_by: string;
}

export class PgDeviceStatusHistoryRepository {
    private pool: Pool;

    constructor() {
        this.pool = getPool();
    }

    async findByDeviceId(
        deviceId: number,
        limit = 50,
        offset = 0,
    ): Promise<StatusHistoryRow[]> {
        const result = await this.pool.query(
            `SELECT id, device_id, previous_status, new_status, changed_at, changed_by
             FROM device_status_history
             WHERE device_id = $1
             ORDER BY changed_at DESC
             LIMIT $2 OFFSET $3`,
            [deviceId, limit, offset],
        );
        return result.rows;
    }

    async findByDeviceIdTx(
        client: PoolClient,
        deviceId: number,
        limit = 50,
    ): Promise<StatusHistoryRow[]> {
        const result = await client.query(
            `SELECT id, device_id, previous_status, new_status, changed_at, changed_by
             FROM device_status_history
             WHERE device_id = $1
             ORDER BY changed_at DESC
             LIMIT $2`,
            [deviceId, limit],
        );
        return result.rows;
    }

    async create(
        client: PoolClient,
        entry: {
            deviceId: number;
            previousStatus: string;
            newStatus: string;
            changedBy: string;
        },
    ): Promise<StatusHistoryRow> {
        const result = await client.query(
            `INSERT INTO device_status_history (device_id, previous_status, new_status, changed_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [entry.deviceId, entry.previousStatus, entry.newStatus, entry.changedBy],
        );
        return result.rows[0];
    }

    async countByDeviceId(deviceId: number): Promise<number> {
        const result = await this.pool.query(
            `SELECT COUNT(*)::int AS count FROM device_status_history WHERE device_id = $1`,
            [deviceId],
        );
        return result.rows[0].count;
    }
}
