// ---------------------------------------------------------------------------
// Application / Middleware — barrel export
// ---------------------------------------------------------------------------

export { createAuthMiddleware } from './auth.middleware.js';
export { requireRole } from './rbac.middleware.js';
export { validateInput, schemas } from './validate-input.js';
export { errorHandler } from './error-handler.js';
export { requestLogger } from './request-logger.js';
export { correlationMiddleware } from './correlation.js';
export { rateLimit } from './rate-limiter.js';
