import type { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../shared/errors/domain.error.js';
import { logger } from '../../shared/logger/logger.js';

/**
 * Global error handler middleware.
 * Catches unhandled errors from route handlers and returns consistent JSON responses.
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // Domain errors → 4xx
    if (err instanceof DomainError) {
        const statusMap: Record<string, number> = {
            DEVICE_NOT_FOUND: 404,
            EVENT_DUPLICATE: 409,
            INVALID_STATE_TRANSITION: 422,
        };
        const status = statusMap[err.code] || 400;

        logger.warn('Domain error', {
            code: err.code,
            message: err.message,
            context: err.context,
        });

        res.status(status).json({
            error: {
                code: err.code,
                message: err.message,
                context: err.context,
            },
        });
        return;
    }

    // Unknown errors → 500
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
    });

    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
    });
}
