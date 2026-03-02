import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { logger } from '../../shared/logger/logger.js';

// ---------------------------------------------------------------------------
// CSRF Double-Submit Cookie Protection
// ---------------------------------------------------------------------------
// Strategy: On login, the server sets a `csrf-token` cookie (readable by JS)
// and the client must send it back as `X-CSRF-Token` header on state-changing
// requests (POST, PUT, PATCH, DELETE). The server validates that both match.
// ---------------------------------------------------------------------------

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Set the CSRF cookie on a response.
 * This cookie is NOT HttpOnly so the frontend JS can read it.
 */
export function setCsrfCookie(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,    // JS must be able to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
}

/**
 * CSRF validation middleware.
 * Skips safe methods (GET, HEAD, OPTIONS).
 * Validates that the X-CSRF-Token header matches the csrf-token cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    // Skip safe (read-only) methods
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
        logger.warn('CSRF validation failed: missing token', {
            path: req.path,
            method: req.method,
            hasCookie: !!cookieToken,
            hasHeader: !!headerToken,
        });
        res.status(403)
            .contentType('application/problem+json')
            .json({
                type: 'https://api.smartaccess.io/errors/csrf-validation-failed',
                title: 'CSRF Validation Failed',
                status: 403,
                detail: 'Missing CSRF token. Include X-CSRF-Token header.',
                instance: req.originalUrl,
            });
        return;
    }

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
        logger.warn('CSRF validation failed: token mismatch', {
            path: req.path,
            method: req.method,
        });
        res.status(403)
            .contentType('application/problem+json')
            .json({
                type: 'https://api.smartaccess.io/errors/csrf-validation-failed',
                title: 'CSRF Validation Failed',
                status: 403,
                detail: 'CSRF token mismatch',
                instance: req.originalUrl,
            });
        return;
    }

    next();
}
