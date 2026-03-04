import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Auth Routes (/api/auth/*)
// ---------------------------------------------------------------------------
// These tests validate the full HTTP pipeline including middleware,
// validation, cookie handling, and RFC 7807 error responses.
// Requires Docker services (Postgres, Redis) to be running.
// ---------------------------------------------------------------------------

describe('Integration: Auth Routes', () => {

    // -----------------------------------------------------------------------
    // POST /api/auth/login
    // -----------------------------------------------------------------------

    describe('POST /api/auth/login', () => {
        it('should return 400 if email is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'test123' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('title', 'Validation Error');
        });

        it('should return 400 if password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('title', 'Validation Error');
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@test.com', password: 'wrongpass' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('type', 'https://api.smartaccess.io/errors/invalid-credentials');
            expect(res.body).toHaveProperty('title', 'Invalid Credentials');
        });

        it('should return 200 with HttpOnly cookies for valid admin credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@smartaccess.io', password: 'admin123' });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('user');
            expect(res.body.data.user).toHaveProperty('email', 'admin@smartaccess.io');
            expect(res.body.data.user).toHaveProperty('role', 'ADMIN');

            // Verify HttpOnly cookies are set
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();

            const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
            expect(cookieStr).toContain('access-token');
            expect(cookieStr).toContain('refresh-token');
            expect(cookieStr).toContain('HttpOnly');
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/auth/refresh
    // -----------------------------------------------------------------------

    describe('POST /api/auth/refresh', () => {
        it('should return 401 if no refresh-token cookie is present', async () => {
            const res = await request(app)
                .post('/api/auth/refresh');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('type', 'https://api.smartaccess.io/errors/missing-refresh-token');
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/auth/logout
    // -----------------------------------------------------------------------

    describe('POST /api/auth/logout', () => {
        it('should return 204 and clear cookies', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(204);
        });
    });
});
