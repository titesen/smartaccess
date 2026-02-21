import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../domain/auth/auth.types.js';

/**
 * Creates an RBAC middleware that checks if the authenticated user has
 * one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: `Role "${req.user.role}" does not have access to this resource`,
                },
            });
            return;
        }

        next();
    };
}
