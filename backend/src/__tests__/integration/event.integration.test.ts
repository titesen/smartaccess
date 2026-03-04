import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Event Routes (/api/v1/events)
// ---------------------------------------------------------------------------
// Requires Docker services (Postgres) and an authenticated session.
// ---------------------------------------------------------------------------

describe('Integration: Event Routes', () => {
    let authCookies: string[];

    beforeAll(async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@smartaccess.io', password: 'admin123' });

        authCookies = loginRes.headers['set-cookie'] || [];
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/events
    // -----------------------------------------------------------------------

    describe('GET /api/v1/events', () => {
        it('should return 401 without authentication', async () => {
            const res = await request(app).get('/api/v1/events');
            expect(res.status).toBe(401);
        });

        it('should return 200 with paginated events when authenticated', async () => {
            const res = await request(app)
                .get('/api/v1/events?limit=10&offset=0')
                .set('Cookie', authCookies);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('limit', 10);
            expect(res.body).toHaveProperty('offset', 0);
        });
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/events/:uuid
    // -----------------------------------------------------------------------

    describe('GET /api/v1/events/:uuid', () => {
        it('should return 404 for a non-existent event UUID', async () => {
            const res = await request(app)
                .get('/api/v1/events/00000000-0000-0000-0000-000000000000')
                .set('Cookie', authCookies);

            expect(res.status).toBe(404);
        });
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/events/dlq/list
    // -----------------------------------------------------------------------

    describe('GET /api/v1/events/dlq/list', () => {
        it('should return 200 with DLQ events when authenticated', async () => {
            const res = await request(app)
                .get('/api/v1/events/dlq/list')
                .set('Cookie', authCookies);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
