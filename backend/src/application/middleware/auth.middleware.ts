import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';
import { logger } from '../../shared/logger/logger.js';

// Extend Express Request
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

/**
 * Creates an auth middleware that validates JWT from Authorization header.
 * Attaches `req.user` on success.
 * Returns RFC 7807 Problem Details on failure.
 */
export function createAuthMiddleware(authService: AuthService) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            res.status(401)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/unauthorized',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'Missing or invalid Authorization header',
                    instance: req.originalUrl,
                });
            return;
        }

        const token = header.slice(7);
        const payload = authService.verifyToken(token);

        if (!payload) {
            logger.warn('Invalid or expired JWT', { path: req.path });
            res.status(401)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/token-expired',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'Invalid or expired token',
                    instance: req.originalUrl,
                });
            return;
        }

        req.user = { id: payload.userId, email: payload.email, role: payload.role };
        next();
    };
}
