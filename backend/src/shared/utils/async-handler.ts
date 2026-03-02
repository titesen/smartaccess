import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper — eliminates repetitive try-catch blocks in route handlers.
 *
 * Catches any rejected promise from an async route handler and forwards it
 * to Express's global error-handling middleware (error-handler.ts).
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => {
 *       const data = await service.getAll();
 *       res.json({ data });
 *   }));
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
