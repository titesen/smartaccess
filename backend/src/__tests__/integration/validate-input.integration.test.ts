import { describe, it, expect, beforeEach } from 'vitest';
import { validateInput, schemas } from '../../application/middleware/validate-input.js';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/test-helpers.js';

describe('validateInput middleware', () => {
    let next: ReturnType<typeof createMockNext>;

    beforeEach(() => {
        next = createMockNext();
    });

    describe('login schema', () => {
        const middleware = validateInput(schemas.login);

        it('should pass with valid email and password', () => {
            const req = createMockRequest({
                body: { email: 'admin@test.com', password: 'secret123' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject missing email', () => {
            const req = createMockRequest({
                body: { password: 'secret123' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res._body).toHaveProperty('title', 'Validation Error');
        });

        it('should reject missing password', () => {
            const req = createMockRequest({
                body: { email: 'admin@test.com' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject invalid email format', () => {
            const req = createMockRequest({
                body: { email: 'not-an-email', password: 'secret123' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject password shorter than 6 chars', () => {
            const req = createMockRequest({
                body: { email: 'admin@test.com', password: '12345' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('register schema', () => {
        const middleware = validateInput(schemas.register);

        it('should pass with valid email, password, and role', () => {
            const req = createMockRequest({
                body: { email: 'op@test.com', password: 'secure99', role: 'OPERATOR' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).toHaveBeenCalled();
        });

        it('should pass without role (optional)', () => {
            const req = createMockRequest({
                body: { email: 'op@test.com', password: 'secure99' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject invalid role', () => {
            const req = createMockRequest({
                body: { email: 'op@test.com', password: 'secure99', role: 'SUPERADMIN' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateDeviceStatus schema', () => {
        const middleware = validateInput(schemas.updateDeviceStatus);

        it('should pass with valid device status', () => {
            const req = createMockRequest({
                body: { status: 'ONLINE' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject missing status', () => {
            const req = createMockRequest({ body: {} });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject invalid status value', () => {
            const req = createMockRequest({
                body: { status: 'INVALID_STATUS' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('uuidParam schema', () => {
        const middleware = validateInput(schemas.uuidParam);

        it('should pass with valid UUID', () => {
            const req = createMockRequest({
                params: { id: '550e8400-e29b-41d4-a716-446655440000' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject invalid UUID', () => {
            const req = createMockRequest({
                params: { id: 'not-a-uuid' },
            });
            const res = createMockResponse();

            middleware(req as never, res as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
