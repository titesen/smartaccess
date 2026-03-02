import { Router, type Request, type Response } from 'express';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { getPool } from '../../infrastructure/database/connection.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export function createAuditRoutes(auditRepo: IAuditRepository): Router {
    const router = Router();

    // GET /api/v1/audit
    router.get('/', asyncHandler(async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

        const client = await getPool().connect();
        try {
            const logs = await auditRepo.findWithPagination(client, limit, offset);
            res.json({ data: logs });
        } finally {
            client.release();
        }
    }));

    return router;
}
