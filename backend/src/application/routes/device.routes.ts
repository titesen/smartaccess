import { Router, type Request, type Response } from 'express';
import type { DeviceService } from '../services/device.service.js';
import type { DeviceStatus } from '../../domain/devices/device.types.js';
import { validateInput, schemas } from '../middleware/validate-input.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export function createDeviceRoutes(deviceService: DeviceService): Router {
    const router = Router();

    // GET /api/v1/devices — List all devices
    router.get('/', asyncHandler(async (_req: Request, res: Response) => {
        const devices = await deviceService.getAll();
        res.json({ data: devices, total: devices.length });
    }));

    // GET /api/v1/devices/:uuid — Get device by UUID
    router.get('/:uuid', asyncHandler(async (req: Request, res: Response) => {
        const device = await deviceService.getByUuid(req.params.uuid);
        if (!device) {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        res.json({ data: device });
    }));

    // PATCH /api/v1/devices/:uuid/status — Update device status
    router.patch('/:uuid/status', validateInput(schemas.updateDeviceStatus), asyncHandler(async (req: Request, res: Response) => {
        const { status } = req.body as { status: DeviceStatus };
        const device = await deviceService.updateStatus(req.params.uuid, status);
        if (!device) {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        res.json({ data: device });
    }));

    return router;
}
