import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../domain/auth/auth.types.js';

/**
 * Creates an RBAC middleware that checks if the authenticated user has
 * one of the allowed roles.
 * Returns RFC 7807 Problem Details on failure.
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/unauthorized',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'Authentication required',
                    instance: req.originalUrl,
                });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403)
                .contentType('application/problem+json')
                .json({
                    type: 'https://api.smartaccess.io/errors/forbidden',
                    title: 'Forbidden',
                    status: 403,
                    detail: `Role "${req.user.role}" does not have access to this resource`,
                    instance: req.originalUrl,
                });
            return;
        }

        next();
    };
}
