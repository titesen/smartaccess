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
                res.status(401)
                    .contentType('application/problem+json')
                    .json({
                        type: 'https://api.smartaccess.io/errors/invalid-credentials',
                        title: 'Invalid Credentials',
                        status: 401,
                        detail: 'The provided email or password is incorrect',
                        instance: req.originalUrl,
                    });
                return;
            }
            res.json({ data: result });
        } catch (err) {
            res.status(500)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/login-failed',
                    title: 'Login Failed',
                    status: 500,
                    detail: err instanceof Error ? err.message : String(err),
                    instance: req.originalUrl,
                });
        }
    });

    // POST /api/auth/refresh — Exchange refresh token for new access + refresh pair
    router.post('/refresh', async (req: Request, res: Response) => {
        const { refreshToken } = req.body as { refreshToken?: string };

        if (!refreshToken) {
            res.status(400)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/missing-refresh-token',
                    title: 'Bad Request',
                    status: 400,
                    detail: 'refreshToken is required in the request body',
                    instance: req.originalUrl,
                });
            return;
        }

        try {
            const result = await authService.refreshAccessToken(refreshToken);
            if (!result) {
                res.status(401)
                    .contentType('application/problem+json')
                    .json({
                        type: 'https://api.smartaccess.io/errors/invalid-refresh-token',
                        title: 'Invalid Refresh Token',
                        status: 401,
                        detail: 'The refresh token is invalid, expired, or has been revoked',
                        instance: req.originalUrl,
                    });
                return;
            }
            res.json({ data: result });
        } catch (err) {
            res.status(500)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/refresh-failed',
                    title: 'Token Refresh Failed',
                    status: 500,
                    detail: err instanceof Error ? err.message : String(err),
                    instance: req.originalUrl,
                });
        }
    });

    // POST /api/auth/logout — Revoke the refresh token
    router.post('/logout', async (req: Request, res: Response) => {
        const { refreshToken } = req.body as { refreshToken?: string };

        if (refreshToken) {
            try {
                await authService.revokeRefreshToken(refreshToken);
            } catch (err) {
                // Log but do not fail — logout should always succeed for the client
                const message = err instanceof Error ? err.message : String(err);
                console.error('Failed to revoke refresh token:', message);
            }
        }

        res.status(204).end();
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
            res.status(status)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/registration-failed',
                    title: 'Registration Failed',
                    status,
                    detail: message,
                    instance: req.originalUrl,
                });
        }
    });

    return router;
}
