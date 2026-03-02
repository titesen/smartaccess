import type { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../shared/errors/domain.error.js';
import { logger } from '../../shared/logger/logger.js';

/**
 * RFC 7807 Problem Details factory.
 * @see https://www.rfc-editor.org/rfc/rfc7807.html
 */
interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    [extension: string]: unknown;
}

function problemDetails(
    status: number,
    title: string,
    detail: string,
    instance?: string,
    extensions?: Record<string, unknown>,
): ProblemDetails {
    return {
        type: `https://api.smartaccess.io/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
        title,
        status,
        detail,
        ...(instance && { instance }),
        ...extensions,
    };
}

/**
 * Global error handler middleware.
 * Returns RFC 7807 `application/problem+json` responses.
 */
export function errorHandler(
    err: Error,
    req: Request,
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

        res.status(status)
            .contentType('application/problem+json')
            .json(problemDetails(
                status,
                err.code,
                err.message,
                req.originalUrl,
                err.context ? { context: err.context } : undefined,
            ));
        return;
    }

    // Unknown errors → 500
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
    });

    res.status(500)
        .contentType('application/problem+json')
        .json(problemDetails(
            500,
            'Internal Server Error',
            'An unexpected error occurred',
            req.originalUrl,
        ));
}

export { problemDetails };
