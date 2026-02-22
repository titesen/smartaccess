import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../services/auth.service.js';
import { UserRole } from '../../domain/auth/auth.types.js';
import { validateInput, schemas } from '../middleware/validate-input.js';

export function createAuthRoutes(authService: AuthService): Router {
    const router = Router();

    // POST /api/auth/login
    router.post('/login', validateInput(schemas.login), async (req: Request, res: Response) => {
        const { email, password } = req.body as { email: string; password: string };

        try {
            const result = await authService.login(email, password, req.ip);
            if (!result) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            res.json({ data: result });
        } catch (err) {
            res.status(500).json({
                error: 'Login failed',
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });

    // POST /api/auth/register (for dev/seeding only)
    router.post('/register', validateInput(schemas.register), async (req: Request, res: Response) => {
        const { email, password, role } = req.body as {
            email: string;
            password: string;
            role?: string;
        };

        const userRole = (role as UserRole) || UserRole.VIEWER;

        try {
            const user = await authService.register(email, password, userRole);
            res.status(201).json({ data: user });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const status = message.includes('already exists') ? 409 : 500;
            res.status(status).json({ error: message });
        }
    });

    return router;
}
