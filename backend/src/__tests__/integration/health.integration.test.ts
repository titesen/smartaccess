import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../main.js'; // The Express app

describe('Integration Test: Express API Pipeline', () => {

    it('GET /api/v1/metrics/summary should return 401 Unauthorized (Auth Middleware)', async () => {
        const response = await request(app).get('/api/v1/metrics/summary');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('type', 'https://api.smartaccess.io/errors/unauthorized');
        expect(response.body).toHaveProperty('title', 'Unauthorized');
    });

    it('POST /api/auth/login should return 400 Bad Request if missing fields (Validation Middleware)', async () => {
        const response = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('title', 'Validation Error');
    });

    it('GET /api/unknown-route should return 404 Not Found', async () => {
        const response = await request(app).get('/api/unknown-route');

        expect(response.status).toBe(404);
        expect(response.text).toContain('Cannot GET /api/unknown-route');
    });
});
