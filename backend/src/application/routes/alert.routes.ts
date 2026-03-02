import { Router, type Request, type Response } from 'express';
import { AlertService } from '../services/alert.service.js';
import { getPool } from '../../infrastructure/database/connection.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export function createAlertRoutes(alertService: AlertService): Router {
    const router = Router();

    // GET /api/v1/alerts
    router.get('/', asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string, 10) || 50;
        const alerts = await alertService.getRecentAlerts(limit);
        res.json({ data: alerts });
    }));

    // POST /api/v1/alerts/:id/acknowledge
    router.post('/:id/acknowledge', asyncHandler(async (req: Request, res: Response) => {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const actor = req.user?.email ?? 'SYSTEM';
            await alertService.acknowledgeAlert(client, parseInt(req.params.id, 10), actor);
            res.json({ success: true });
        } finally {
            client.release();
        }
    }));

    return router;
}
