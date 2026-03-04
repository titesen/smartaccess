import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../../shared/logger/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock getPool — AlertService calls getPool() in its constructor
const mockPoolQuery = vi.fn();
vi.mock('../../../infrastructure/database/connection.js', () => ({
    getPool: () => ({ query: mockPoolQuery, connect: vi.fn() }),
}));

import { AlertService } from '../alert.service.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertService', () => {
    let alertService: AlertService;

    beforeEach(() => {
        vi.clearAllMocks();
        alertService = new AlertService(300_000);
    });

    // -----------------------------------------------------------------------
    // createAlert
    // -----------------------------------------------------------------------

    describe('createAlert', () => {
        it('should create an alert when no duplicate exists', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // dedup check
            mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // INSERT

            const result = await alertService.createAlert({
                deviceId: 1,
                deviceUuid: 'dev-001',
                metric: 'temperature',
                value: 95,
                threshold: 80,
                severity: 'high',
            });

            expect(result).not.toBeNull();
            expect(result!.device_id).toBe(1);
            expect(result!.metric).toBe('temperature');
            expect(result!.severity).toBe('high');
            expect(result!.status).toBe('OPEN');
            expect(mockPoolQuery).toHaveBeenCalledTimes(2);
        });

        it('should return null if a duplicate alert exists within the dedup window', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });

            const result = await alertService.createAlert({
                deviceId: 1,
                deviceUuid: 'dev-001',
                metric: 'temperature',
                value: 96,
                threshold: 80,
                severity: 'high',
            });

            expect(result).toBeNull();
            expect(mockPoolQuery).toHaveBeenCalledTimes(1);
        });

        it('should include eventId in the alert payload when provided', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            const result = await alertService.createAlert(
                {
                    deviceId: 2,
                    deviceUuid: 'dev-002',
                    metric: 'humidity',
                    value: 100,
                    threshold: 90,
                    severity: 'critical',
                },
                42,
            );

            expect(result!.event_id).toBe(42);
        });
    });

    // -----------------------------------------------------------------------
    // acknowledgeAlert
    // -----------------------------------------------------------------------

    describe('acknowledgeAlert', () => {
        it('should insert ALERT_ACKNOWLEDGED event into audit_log', async () => {
            const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) } as any;

            await alertService.acknowledgeAlert(mockClient, 55, 'operator@test.com');

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO audit_log'),
                expect.arrayContaining([
                    'ALERT_ACKNOWLEDGED',
                    'DOMAIN',
                    'Alert',
                    '55',
                ]),
            );
        });
    });

    // -----------------------------------------------------------------------
    // getRecentAlerts
    // -----------------------------------------------------------------------

    describe('getRecentAlerts', () => {
        it('should query audit_log for ALERT_TRIGGERED events', async () => {
            mockPoolQuery.mockResolvedValueOnce({
                rows: [
                    { id: 1, action: 'ALERT_TRIGGERED', entityType: 'Alert', acknowledged: false },
                ],
            });

            const result = await alertService.getRecentAlerts(10);

            expect(result).toHaveLength(1);
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining('ALERT_TRIGGERED'),
                [10],
            );
        });
    });
});
