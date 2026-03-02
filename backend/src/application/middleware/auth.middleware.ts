import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';
import type { TokenBlacklist } from '../services/token-blacklist.service.js';
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
 * Creates an auth middleware that validates access tokens from:
 * 1. HttpOnly cookie `access-token` (primary — browser)
 * 2. Authorization: Bearer header (fallback — API clients, mobile)
 *
 * Checks the Redis blacklist for revoked tokens.
 * Returns RFC 7807 Problem Details on failure.
 */
export function createAuthMiddleware(authService: AuthService, blacklist?: TokenBlacklist) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Read token from cookie first (HttpOnly), then fallback to Bearer header
        let token = req.cookies?.['access-token'];

        if (!token) {
            const header = req.headers.authorization;
            if (header && header.startsWith('Bearer ')) {
                token = header.slice(7);
            }
        }

        if (!token) {
            res.status(401)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/unauthorized',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'Missing authentication token',
                    instance: req.originalUrl,
                });
            return;
        }

        const payload = authService.verifyToken(token);

        if (!payload) {
            logger.warn('Invalid or expired token', { path: req.path });
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

        // Check Redis blacklist for immediate revocation
        if (blacklist) {
            const isBlacklisted = await blacklist.isBlacklisted(token);
            if (isBlacklisted) {
                logger.warn('Revoked token used', { userId: payload.userId, path: req.path });
                res.status(401)
                    .contentType('application/problem+json')
                    .json({
                        type: 'https://api.smartaccess.io/errors/token-revoked',
                        title: 'Unauthorized',
                        status: 401,
                        detail: 'This token has been revoked',
                        instance: req.originalUrl,
                    });
                return;
            }
        }

        req.user = { id: payload.userId, email: payload.email, role: payload.role };
        next();
    };
}
