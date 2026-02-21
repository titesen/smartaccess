import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';
import { logger } from '../../shared/logger/logger.js';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

/**
 * Creates an auth middleware that validates JWT from Authorization header.
 * Attaches `req.user` on success.
 */
export function createAuthMiddleware(authService: AuthService) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
            return;
        }

        const token = header.slice(7);
        const payload = authService.verifyToken(token);

        if (!payload) {
            logger.warn('Invalid or expired JWT', { path: req.path });
            res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
            return;
        }

        req.user = { id: payload.userId, email: payload.email, role: payload.role };
        next();
    };
}
