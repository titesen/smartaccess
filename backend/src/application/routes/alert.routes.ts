import { Router, type Request, type Response } from 'express';
import { AlertService } from '../services/alert.service.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';

// Extend Request for the typed user property attached by auth middleware
interface AuthRequest extends Request {
    user?: AuthUser;
}

export function createAlertRoutes(alertService: AlertService): Router {
    const router = Router();

    // GET /api/alerts
    router.get('/', async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string, 10) || 50;
            const alerts = await alertService.getRecentAlerts(limit);
            res.json({ data: alerts });
        } catch {
            res.status(500).json({ error: 'Failed to fetch alerts' });
        }
    });

    // POST /api/alerts/:id/acknowledge
    router.post('/:id/acknowledge', async (req: Request, res: Response) => {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const actor = (req as AuthRequest).user?.email ?? 'SYSTEM';
            await alertService.acknowledgeAlert(client, parseInt(req.params.id, 10), actor);
            res.json({ success: true });
        } catch {
            res.status(500).json({ error: 'Failed to acknowledge alert' });
        } finally {
            client.release();
        }
    });

    return router;
}
