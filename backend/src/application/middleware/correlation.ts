import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger/logger.js';
import { generateCorrelationId } from '../../infrastructure/observability/tracing.js';

/**
 * Distributed Tracing Correlation Middleware.
 *
 * Adds or propagates correlation IDs across requests for end-to-end tracing.
 * If an incoming request includes an `x-correlation-id` header, the value is
 * preserved. Otherwise, a new UUID is generated.
 *
 * The correlation ID is:
 * - Set on `req.correlationId` for use in downstream logic
 * - Included in the response headers for client visibility
 * - Injected into the structured logger context
 */

// Extend Express Request to include correlationId
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

export function correlationMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Propagate existing correlation ID or generate new one
        const correlationId =
            (req.headers['x-correlation-id'] as string) ||
            (req.headers['x-request-id'] as string) ||
            generateCorrelationId();

        // Attach to request for downstream use
        req.correlationId = correlationId;

        // Set response headers for client tracing
        res.setHeader('x-correlation-id', correlationId);
        res.setHeader('x-request-id', correlationId);

        // Log the correlation context
        logger.info('Request started', {
            correlationId,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.headers['user-agent']?.slice(0, 100),
        });

        // Track response timing
        const start = Date.now();
        res.on('finish', () => {
            const durationMs = Date.now() - start;
            logger.info('Request completed', {
                correlationId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                durationMs,
            });
        });

        next();
    };
}
