import type pg from 'pg';

export interface SystemSetting {
    key: string;
    value: any;
    updatedAt: Date;
    updatedBy: string;
}

export interface ISettingsRepository {
    getAllSettings(client: pg.PoolClient): Promise<Record<string, SystemSetting>>;
    updateSettings(client: pg.PoolClient, settings: Record<string, any>, updatedBy: string): Promise<Record<string, SystemSetting>>;
}

export class PgSettingsRepository implements ISettingsRepository {
    async getAllSettings(client: pg.PoolClient): Promise<Record<string, SystemSetting>> {
        const { rows } = await client.query(
            `SELECT key, value, updated_at, updated_by
             FROM system_settings`
        );

        const settingsMap: Record<string, SystemSetting> = {};
        for (const row of rows) {
            settingsMap[row.key] = {
                key: row.key,
                value: row.value,
                updatedAt: row.updated_at,
                updatedBy: row.updated_by,
            };
        }
        return settingsMap;
    }

    async updateSettings(client: pg.PoolClient, settings: Record<string, any>, updatedBy: string): Promise<Record<string, SystemSetting>> {
        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                `INSERT INTO system_settings (key, value, updated_by)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (key) DO UPDATE
                 SET value = EXCLUDED.value,
                     updated_by = EXCLUDED.updated_by`,
                [key, JSON.stringify(value), updatedBy]
            );
        }
        return this.getAllSettings(client);
    }
}
