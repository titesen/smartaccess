import { Router, type Request, type Response } from 'express';
import { getPool } from '../../infrastructure/database/connection.js';
import type { IEventRepository } from '../../infrastructure/repositories/event.repository.js';

export function createEventRoutes(eventRepo: IEventRepository): Router {
    const router = Router();

    // GET /api/events — List events (paginated)
    router.get('/', async (req: Request, res: Response) => {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const offset = parseInt(req.query.offset as string) || 0;

        const pool = getPool();
        const client = await pool.connect();
        try {
            const events = await eventRepo.findAll(client, limit, offset);
            res.json({ data: events, limit, offset, total: events.length });
        } catch (err) {
            res.status(500).json({
                error: 'Failed to retrieve events',
                message: err instanceof Error ? err.message : String(err),
            });
        } finally {
            client.release();
        }
    });

    // GET /api/events/:uuid — Get event by UUID
    router.get('/:uuid', async (req: Request, res: Response) => {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const event = await eventRepo.findByUuid(client, req.params.uuid);
            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }
            res.json({ data: event });
        } catch (err) {
            res.status(500).json({
                error: 'Failed to retrieve event',
                message: err instanceof Error ? err.message : String(err),
            });
        } finally {
            client.release();
        }
    });

    // GET /api/events/dlq — List dead-lettered events
    router.get('/dlq/list', async (_req: Request, res: Response) => {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT dle.id, dle.original_event_id, dle.payload, dle.failure_reason, dle.moved_at,
                        e.event_uuid, e.event_type, e.device_id
                 FROM dead_letter_events dle
                 JOIN events e ON e.id = dle.original_event_id
                 ORDER BY dle.moved_at DESC
                 LIMIT 100`,
            );
            res.json({ data: rows, total: rows.length });
        } catch (err) {
            res.status(500).json({
                error: 'Failed to retrieve DLQ events',
                message: err instanceof Error ? err.message : String(err),
            });
        } finally {
            client.release();
        }
    });

    return router;
}
