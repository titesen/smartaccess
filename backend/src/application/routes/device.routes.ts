import { Router, type Request, type Response } from 'express';
import type { DeviceService } from '../services/device.service.js';
import type { DeviceStatus } from '../../domain/devices/device.types.js';

export function createDeviceRoutes(deviceService: DeviceService): Router {
    const router = Router();

    // GET /api/devices — List all devices
    router.get('/', async (_req: Request, res: Response) => {
        try {
            const devices = await deviceService.getAll();
            res.json({ data: devices, total: devices.length });
        } catch (err) {
            res.status(500).json({
                error: 'Failed to retrieve devices',
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });

    // GET /api/devices/:uuid — Get device by UUID
    router.get('/:uuid', async (req: Request, res: Response) => {
        try {
            const device = await deviceService.getByUuid(req.params.uuid);
            if (!device) {
                res.status(404).json({ error: 'Device not found' });
                return;
            }
            res.json({ data: device });
        } catch (err) {
            res.status(500).json({
                error: 'Failed to retrieve device',
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });

    // PATCH /api/devices/:uuid/status — Update device status
    router.patch('/:uuid/status', async (req: Request, res: Response) => {
        const { status } = req.body as { status?: DeviceStatus };
        if (!status) {
            res.status(400).json({ error: 'Missing "status" in request body' });
            return;
        }

        try {
            const device = await deviceService.updateStatus(req.params.uuid, status);
            if (!device) {
                res.status(404).json({ error: 'Device not found' });
                return;
            }
            res.json({ data: device });
        } catch (err) {
            // InvalidStateTransitionError → 422
            if (err instanceof Error && err.name === 'InvalidStateTransitionError') {
                res.status(422).json({ error: err.message });
                return;
            }
            res.status(500).json({
                error: 'Failed to update device status',
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });

    return router;
}
