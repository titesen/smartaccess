import { Pool, PoolClient } from 'pg';
import { getPool } from '../../infrastructure/database/connection.js';
import { logger } from '../../shared/logger/logger.js';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';

interface AlertData {
    deviceId: number;
    deviceUuid: string;
    metric: string;
    value: number;
    threshold: number;
    severity: AlertSeverity;
}

interface AlertRecord {
    id: number;
    event_id: number | null;
    device_id: number;
    severity: AlertSeverity;
    metric: string;
    value: number;
    threshold: number;
    status: AlertStatus;
    acknowledged_by: string | null;
    acknowledged_at: Date | null;
    resolved_at: Date | null;
    created_at: Date;
}

/**
 * Service for managing alerts triggered by threshold breaches.
 *
 * Responsibilities:
 * - Create alert records from telemetry threshold breaches
 * - Manage alert lifecycle (acknowledge, resolve, suppress)
 * - Query active alerts with filtering
 * - Deduplicate alerts for the same device+metric within a time window
 */
export class AlertService {
    private pool: Pool;
    private deduplicationWindowMs: number;

    constructor(deduplicationWindowMs = 300_000) { // 5 minutes default
        this.pool = getPool();
        this.deduplicationWindowMs = deduplicationWindowMs;
    }

    /**
     * Create an alert if no duplicate exists within the deduplication window.
     */
    async createAlert(data: AlertData, eventId?: number): Promise<AlertRecord | null> {
        // Check for existing recent alert for the same device + metric
        const duplicate = await this.pool.query(
            `SELECT id FROM audit_log
             WHERE aggregate_type = 'Alert'
             AND aggregate_id = $1
             AND new_state->>'metric' = $2
             AND created_at > NOW() - INTERVAL '1 millisecond' * $3`,
            [String(data.deviceId), data.metric, this.deduplicationWindowMs],
        );

        if (duplicate.rows.length > 0) {
            logger.debug('Alert deduplicated', {
                deviceId: data.deviceId,
                metric: data.metric,
            });
            return null;
        }

        // Log the alert to audit_log (alerts are audit events per the architecture doc)
        await this.pool.query(
            `INSERT INTO audit_log
                (event_type, category, aggregate_type, aggregate_id,
                 previous_state, new_state, actor, result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                'ALERT_TRIGGERED',
                'DOMAIN',
                'Alert',
                String(data.deviceId),
                null,
                JSON.stringify({
                    metric: data.metric,
                    value: data.value,
                    threshold: data.threshold,
                    severity: data.severity,
                    deviceUuid: data.deviceUuid,
                    eventId,
                }),
                'SYSTEM',
                'SUCCESS',
            ],
        );

        logger.warn('Alert triggered', {
            deviceId: data.deviceId,
            deviceUuid: data.deviceUuid,
            metric: data.metric,
            value: data.value,
            threshold: data.threshold,
            severity: data.severity,
        });

        // Return a synthetic alert record
        return {
            id: 0, // audit_log id
            event_id: eventId ?? null,
            device_id: data.deviceId,
            severity: data.severity,
            metric: data.metric,
            value: data.value,
            threshold: data.threshold,
            status: 'OPEN',
            acknowledged_by: null,
            acknowledged_at: null,
            resolved_at: null,
            created_at: new Date(),
        };
    }

    /**
     * Acknowledge an alert (mark as seen by an operator).
     */
    async acknowledgeAlert(
        client: PoolClient,
        alertAuditId: number,
        acknowledgedBy: string,
    ): Promise<void> {
        await client.query(
            `INSERT INTO audit_log
                (event_type, category, aggregate_type, aggregate_id,
                 previous_state, new_state, actor, result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                'ALERT_ACKNOWLEDGED',
                'DOMAIN',
                'Alert',
                String(alertAuditId),
                JSON.stringify({ status: 'OPEN' }),
                JSON.stringify({ status: 'ACKNOWLEDGED' }),
                acknowledgedBy,
                'SUCCESS',
            ],
        );
    }

    /**
     * Get recent alerts from the audit log.
     */
    async getRecentAlerts(limit = 50): Promise<unknown[]> {
        const result = await this.pool.query(
            `SELECT id, event_type, aggregate_id, new_state, actor, created_at
             FROM audit_log
             WHERE event_type = 'ALERT_TRIGGERED'
             AND category = 'DOMAIN'
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit],
        );
        return result.rows;
    }

    /**
     * Get alerts for a specific device.
     */
    async getAlertsByDevice(deviceId: number, limit = 50): Promise<unknown[]> {
        const result = await this.pool.query(
            `SELECT id, event_type, new_state, actor, created_at
             FROM audit_log
             WHERE event_type = 'ALERT_TRIGGERED'
             AND aggregate_type = 'Alert'
             AND aggregate_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [String(deviceId), limit],
        );
        return result.rows;
    }
}
