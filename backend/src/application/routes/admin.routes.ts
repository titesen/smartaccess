import { Router, type Request, type Response } from 'express';
import type { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import type { IAuditRepository } from '../../infrastructure/repositories/audit.repository.js';
import { getPool } from '../../infrastructure/database/connection.js';
import type { UserRole, AuthUser } from '../../domain/auth/auth.types.js';
import { hashPassword } from '../services/auth.service.js';

interface AuthRequest extends Request {
    user?: AuthUser;
}

export function createAdminRoutes(userRepo: IUserRepository, auditRepo: IAuditRepository): Router {
    const router = Router();

    // POST /api/admin/users
    router.post('/users', async (req: Request, res: Response) => {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            res.status(400).json({ error: 'Missing email, password, or role' });
            return;
        }

        const client = await getPool().connect();
        try {
            await client.query('BEGIN');

            const existing = await userRepo.findByEmail(client, email);
            if (existing) {
                await client.query('ROLLBACK');
                res.status(409).json({ error: 'User already exists' });
                return;
            }

            const hashedPassword = await hashPassword(password);
            const newUser = await userRepo.create(client, email, hashedPassword, role as UserRole);

            await auditRepo.create(client, {
                eventType: 'USER_CREATED',
                category: 'SECURITY',
                aggregateType: 'USER',
                aggregateId: String(newUser.id),
                actor: (req as AuthRequest).user?.email ?? 'SYSTEM',
                ipAddress: req.ip ?? null,
                result: 'SUCCESS',
            });

            await client.query('COMMIT');

            res.status(201).json({
                data: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    isActive: newUser.isActive,
                    createdAt: newUser.createdAt,
                    updatedAt: newUser.updatedAt,
                },
            });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: 'Failed to create user' });
        } finally {
            client.release();
        }
    });

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
