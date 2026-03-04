import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Alert Routes (/api/v1/alerts)
// ---------------------------------------------------------------------------
// Requires Docker services (Postgres) and an authenticated session.
// ---------------------------------------------------------------------------

describe('Integration: Alert Routes', () => {
    let authCookies: string[];

    beforeAll(async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@smartaccess.io', password: 'admin123' });

        authCookies = loginRes.headers['set-cookie'] || [];
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/alerts
    // -----------------------------------------------------------------------

    describe('GET /api/v1/alerts', () => {
        it('should return 401 without authentication', async () => {
            const res = await request(app).get('/api/v1/alerts');
            expect(res.status).toBe(401);
        });

        it('should return 200 with an array of alerts when authenticated', async () => {
            const res = await request(app)
                .get('/api/v1/alerts')
                .set('Cookie', authCookies);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/v1/alerts/:id/acknowledge
    // -----------------------------------------------------------------------

    describe('POST /api/v1/alerts/:id/acknowledge', () => {
        it('should return 401 without authentication', async () => {
            const res = await request(app)
                .post('/api/v1/alerts/1/acknowledge');

            expect(res.status).toBe(401);
        });
    });
});
