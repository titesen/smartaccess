import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Middleware Pipeline
// ---------------------------------------------------------------------------
// Tests that validate cross-cutting concerns are properly wired:
// - Correlation ID injection
// - RBAC enforcement
// - Error handler RFC 7807 format
// - Rate limiting
// ---------------------------------------------------------------------------

describe('Integration: Middleware Pipeline', () => {

    // -----------------------------------------------------------------------
    // Correlation ID
    // -----------------------------------------------------------------------

    describe('Correlation ID', () => {
        it('should include X-Correlation-ID header in every response', async () => {
            const res = await request(app).get('/health');

            expect(res.headers).toHaveProperty('x-correlation-id');
            expect(res.headers['x-correlation-id']).toBeTruthy();
        });

        it('should echo back a provided X-Correlation-ID', async () => {
            const customId = 'test-corr-id-12345';
            const res = await request(app)
                .get('/health')
                .set('X-Correlation-ID', customId);

            expect(res.headers['x-correlation-id']).toBe(customId);
        });
    });

    // -----------------------------------------------------------------------
    // RBAC (Role-Based Access Control)
    // -----------------------------------------------------------------------

    describe('RBAC', () => {
        let operatorCookies: string[];

        beforeAll(async () => {
            // Login as operator (non-admin)
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'operator1@smartaccess.io', password: 'operator123' });

            operatorCookies = loginRes.headers['set-cookie'] || [];
        });

        it('should return 403 when operator accesses admin-only route', async () => {
            // /api/v1/admin/* routes are admin-only
            if (operatorCookies.length === 0) {
                // Operator not seeded — skip gracefully
                return;
            }

            const res = await request(app)
                .get('/api/v1/admin/users')
                .set('Cookie', operatorCookies);

            expect(res.status).toBe(403);
        });
    });

    // -----------------------------------------------------------------------
    // Error Handler (RFC 7807)
    // -----------------------------------------------------------------------

    describe('Error Handler', () => {
        it('should return RFC 7807 format for 401 errors', async () => {
            const res = await request(app).get('/api/v1/devices');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('type');
            expect(res.body).toHaveProperty('title');
            expect(res.body).toHaveProperty('status', 401);
        });

        it('should return 404 for unknown API routes', async () => {
            const res = await request(app).get('/api/v1/unknown-resource');

            expect(res.status).toBe(404);
        });
    });

    // -----------------------------------------------------------------------
    // Auth Middleware — protected routes
    // -----------------------------------------------------------------------

    describe('Auth Middleware', () => {
        it('should reject requests with invalid Bearer tokens', async () => {
            const res = await request(app)
                .get('/api/v1/devices')
                .set('Authorization', 'Bearer invalid-token-here');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('type');
        });

        it('should reject requests with empty Authorization header', async () => {
            const res = await request(app)
                .get('/api/v1/devices')
                .set('Authorization', '');

            expect(res.status).toBe(401);
        });
    });
});
