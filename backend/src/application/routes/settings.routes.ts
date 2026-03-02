import { Router, type Request, type Response } from 'express';
import type { ISettingsRepository } from '../../infrastructure/repositories/settings.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { getPool } from '../../infrastructure/database/connection.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export function createSettingsRoutes(settingsRepo: ISettingsRepository, auditRepo: IAuditRepository): Router {
    const router = Router();

    // GET /api/v1/admin/settings
    router.get('/', asyncHandler(async (_req: Request, res: Response) => {
        const client = await getPool().connect();
        try {
            const settings = await settingsRepo.getAllSettings(client);
            res.json({ data: settings });
        } finally {
            client.release();
        }
    }));

    // POST /api/v1/admin/settings
    router.post('/', asyncHandler(async (req: Request, res: Response) => {
        const updates = req.body as Record<string, unknown>;

        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            res.status(400).json({ error: 'Invalid settings payload format' });
            return;
        }

        const client = await getPool().connect();
        try {
            await client.query('BEGIN');

            const actor = req.user?.email ?? 'SYSTEM';
            const newSettings = await settingsRepo.updateSettings(client, updates, actor);

            await auditRepo.create(client, {
                eventType: 'SETTINGS_UPDATED',
                category: 'SECURITY',
                aggregateType: 'SYSTEM_SETTINGS',
                aggregateId: 'global',
                actor,
                ipAddress: req.ip ?? null,
                result: 'SUCCESS',
            });

            await client.query('COMMIT');
            res.status(200).json({ data: newSettings });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err; // Re-throw to let asyncHandler delegate to error handler
        } finally {
            client.release();
        }
    }));

    return router;
}
