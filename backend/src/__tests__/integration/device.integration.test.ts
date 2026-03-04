import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../main.js';

// ---------------------------------------------------------------------------
// Integration: Device Routes (/api/v1/devices)
// ---------------------------------------------------------------------------
// Requires Docker services (Postgres) and a logged-in session.
// ---------------------------------------------------------------------------

describe('Integration: Device Routes', () => {
    let authCookies: string[];

    // Log in once before all tests to get valid auth cookies
    beforeAll(async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@smartaccess.io', password: 'admin123' });

        const cookies = loginRes.headers['set-cookie'];
        authCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/devices
    // -----------------------------------------------------------------------

    describe('GET /api/v1/devices', () => {
        it('should return 401 without authentication', async () => {
            const res = await request(app).get('/api/v1/devices');
            expect(res.status).toBe(401);
        });

        it('should return 200 with a list of devices when authenticated', async () => {
            const res = await request(app)
                .get('/api/v1/devices')
                .set('Cookie', authCookies);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // GET /api/v1/devices/:uuid
    // -----------------------------------------------------------------------

    describe('GET /api/v1/devices/:uuid', () => {
        it('should return 404 for a non-existent UUID', async () => {
            const res = await request(app)
                .get('/api/v1/devices/00000000-0000-0000-0000-000000000000')
                .set('Cookie', authCookies);

            expect(res.status).toBe(404);
        });

        it('should return 200 with device data for a valid UUID', async () => {
            // First, get any existing device from the list
            const listRes = await request(app)
                .get('/api/v1/devices')
                .set('Cookie', authCookies);

            if (listRes.body.data.length === 0) {
                // No devices seeded — skip
                return;
            }

            const uuid = listRes.body.data[0].deviceUuid;
            const res = await request(app)
                .get(`/api/v1/devices/${uuid}`)
                .set('Cookie', authCookies);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('deviceUuid', uuid);
        });
    });
});
