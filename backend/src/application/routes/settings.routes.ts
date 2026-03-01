import { Router, type Request, type Response } from 'express';
import type { ISettingsRepository } from '../../infrastructure/repositories/settings.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';

interface AuthRequest extends Request {
    user?: AuthUser;
}

export function createSettingsRoutes(settingsRepo: ISettingsRepository, auditRepo: IAuditRepository): Router {
    const router = Router();

    // GET /api/admin/settings
    router.get('/', async (_req: Request, res: Response) => {
        const client = await getPool().connect();
        try {
            const settings = await settingsRepo.getAllSettings(client);
            res.json({ data: settings });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve settings' });
        } finally {
            client.release();
        }
    });

    // POST /api/admin/settings
    router.post('/', async (req: AuthRequest, res: Response) => {
        const updates = req.body as Record<string, any>;

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
                actor: actor,
                ipAddress: req.ip ?? null,
                result: 'SUCCESS',
            });

            await client.query('COMMIT');

            res.status(200).json({ data: newSettings });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: 'Failed to update settings' });
        } finally {
            client.release();
        }
    });

    return router;
}
