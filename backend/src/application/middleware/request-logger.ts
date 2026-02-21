import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger/logger.js';

/**
 * Request logger middleware.
 * Assigns a correlation_id to each request and logs start/end with duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    const start = Date.now();

    // Attach to request for downstream usage
    (req as Record<string, unknown>).correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        logger.info('HTTP request', {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            correlationId,
        });
    });

    next();
}
