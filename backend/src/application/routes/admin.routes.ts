import { Router, type Request, type Response } from 'express';
import type { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { UserRole } from '../../domain/auth/auth.types.js';

export function createAdminRoutes(userRepo: IUserRepository): Router {
    const router = Router();

    // GET /api/admin/users
    router.get('/users', async (_req: Request, res: Response) => {
        const client = await getPool().connect();
        try {
            const users = await userRepo.findAll(client);
            res.json({
                data: users.map(u => ({
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    isActive: u.isActive,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt,
                }))
            });
        } finally {
            client.release();
        }
    });

    // PATCH /api/admin/users/:id — update role / isActive
    router.patch('/users/:id', async (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }

        const { role, isActive } = req.body as { role?: string; isActive?: boolean };

        if (role === undefined && isActive === undefined) {
            res.status(400).json({ error: 'Provide role or isActive to update' });
            return;
        }

        const client = await getPool().connect();
        try {
            const updated = await userRepo.update(client, id, {
                role: role as UserRole | undefined,
                isActive,
            });

            if (!updated) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                data: {
                    id: updated.id,
                    email: updated.email,
                    role: updated.role,
                    isActive: updated.isActive,
                    createdAt: updated.createdAt,
                    updatedAt: updated.updatedAt,
                }
            });
        } finally {
            client.release();
        }
    });

    return router;
}
