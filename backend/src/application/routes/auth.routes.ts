import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../services/auth.service.js';
import { UserRole } from '../../domain/auth/auth.types.js';
import { validateInput, schemas } from '../middleware/validate-input.js';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access-token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh-token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

function clearAuthCookies(res: Response): void {
    res.clearCookie('access-token', { path: '/' });
    res.clearCookie('refresh-token', { path: '/api/auth' });
    res.clearCookie('csrf-token', { path: '/' });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function createAuthRoutes(authService: AuthService): Router {
    const router = Router();

    // POST /api/auth/login
    router.post('/login', validateInput(schemas.login), asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body as { email: string; password: string };

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

        setAuthCookies(res, result.accessToken, result.refreshToken);
        const csrfToken = generateCsrfToken();
        setCsrfCookie(res, csrfToken);

        res.json({ data: { user: result.user } });
    }));

    // POST /api/auth/refresh
    router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.['refresh-token'];

        if (!refreshToken) {
            res.status(401)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/missing-refresh-token',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'No refresh token cookie present',
                    instance: req.originalUrl,
                });
            return;
        }

        const result = await authService.refreshAccessToken(refreshToken);
        if (!result) {
            clearAuthCookies(res);
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

        setAuthCookies(res, result.accessToken, result.refreshToken);
        const csrfToken = generateCsrfToken();
        setCsrfCookie(res, csrfToken);

        res.json({ data: { message: 'Token refreshed' } });
    }));

    // POST /api/auth/logout
    router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.['refresh-token'];

        if (refreshToken) {
            await authService.revokeRefreshToken(refreshToken).catch(() => { /* ignore */ });
        }

        clearAuthCookies(res);
        res.status(204).end();
    }));

    // POST /api/auth/register
    router.post('/register', validateInput(schemas.register), asyncHandler(async (req: Request, res: Response) => {
        const { email, password, role } = req.body as {
            email: string;
            password: string;
            role?: string;
        };

        const userRole = (role as UserRole) || UserRole.VIEWER;
        const user = await authService.register(email, password, userRole);
        res.status(201).json({ data: user });
    }));

    return router;
}
