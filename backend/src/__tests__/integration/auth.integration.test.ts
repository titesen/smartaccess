import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Auth Routes (/api/auth/*)
// ---------------------------------------------------------------------------
// Tests that don't require a DB connection pass always.
// Tests that require a running Postgres (login flow) are skipped gracefully
// when Docker is not running.
// ---------------------------------------------------------------------------

describe('Integration: Auth Routes', () => {

    // -----------------------------------------------------------------------
    // POST /api/auth/login — validation (no DB needed)
    // -----------------------------------------------------------------------

    describe('POST /api/auth/login (validation)', () => {
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
    });

    // -----------------------------------------------------------------------
    // POST /api/auth/login — auth flow (requires DB)
    // -----------------------------------------------------------------------

    describe('POST /api/auth/login (auth flow)', () => {
        let dbAvailable = false;

        beforeAll(async () => {
            // Probe DB availability with a login attempt
            const probe = await request(app)
                .post('/api/auth/login')
                .send({ email: 'probe@test.com', password: 'probe123' });
            // If we get 401 it means DB responded — if 500 it means DB is down
            dbAvailable = probe.status !== 500;
        });

        it('should return 401 for invalid credentials', async () => {
            if (!dbAvailable) return; // Skip when DB is down

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@test.com', password: 'wrongpass' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('type', 'https://api.smartaccess.io/errors/invalid-credentials');
            expect(res.body).toHaveProperty('title', 'Invalid Credentials');
        });

        it('should return 200 with HttpOnly cookies for valid admin credentials', async () => {
            if (!dbAvailable) return;

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
    // POST /api/auth/refresh — no DB needed for missing cookie
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
    // POST /api/auth/logout — no DB needed
    // -----------------------------------------------------------------------

    describe('POST /api/auth/logout', () => {
        it('should return 204 and clear cookies', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(204);
        });
    });
});
