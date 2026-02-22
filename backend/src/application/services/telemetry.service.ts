import { Pool } from 'pg';
import { getPool } from '../../infrastructure/database/connection.js';
import { logger } from '../../shared/logger/logger.js';
import { EventObserver, DomainEvents } from '../../domain/events/event.observer.js';

interface TelemetryData {
    deviceId: number;
    deviceUuid: string;
    metrics: Record<string, number>;
    receivedAt: Date;
}

interface TelemetryThreshold {
    metric: string;
    warningThreshold: number;
    criticalThreshold: number;
}

const DEFAULT_THRESHOLDS: TelemetryThreshold[] = [
    { metric: 'cpu_usage', warningThreshold: 80, criticalThreshold: 95 },
    { metric: 'memory_usage', warningThreshold: 85, criticalThreshold: 95 },
    { metric: 'temperature', warningThreshold: 70, criticalThreshold: 85 },
    { metric: 'disk_usage', warningThreshold: 85, criticalThreshold: 95 },
];

/**
 * Service for processing telemetry events.
 *
 * Responsibilities:
 * - Extract and normalize telemetry metrics from event payloads
 * - Check metric values against configurable thresholds
 * - Emit ALERT_TRIGGERED events via the observer when thresholds are breached
 * - Update device's last_seen_at timestamp
 */
export class TelemetryService {
    private pool: Pool;
    private thresholds: TelemetryThreshold[];
    private observer: EventObserver;

    constructor(observer: EventObserver, thresholds?: TelemetryThreshold[]) {
        this.pool = getPool();
        this.thresholds = thresholds ?? DEFAULT_THRESHOLDS;
        this.observer = observer;
    }

    /**
     * Process a telemetry event: check thresholds and update device last_seen_at.
     */
    async processTelemetry(data: TelemetryData): Promise<void> {
        logger.info('Processing telemetry', {
            deviceId: data.deviceId,
            deviceUuid: data.deviceUuid,
            metricsCount: Object.keys(data.metrics).length,
        });

        // Update device last_seen_at
        await this.pool.query(
            `UPDATE devices SET last_seen_at = $1 WHERE id = $2`,
            [data.receivedAt, data.deviceId],
        );

        // Check each metric against thresholds
        for (const threshold of this.thresholds) {
            const value = data.metrics[threshold.metric];
            if (value === undefined) continue;

            if (value >= threshold.criticalThreshold) {
                await this.observer.emit(DomainEvents.ALERT_TRIGGERED, {
                    deviceId: data.deviceId,
                    deviceUuid: data.deviceUuid,
                    metric: threshold.metric,
                    value,
                    threshold: threshold.criticalThreshold,
                    severity: 'critical',
                });
            } else if (value >= threshold.warningThreshold) {
                await this.observer.emit(DomainEvents.ALERT_TRIGGERED, {
                    deviceId: data.deviceId,
                    deviceUuid: data.deviceUuid,
                    metric: threshold.metric,
                    value,
                    threshold: threshold.warningThreshold,
                    severity: 'warning',
                });
            }
        }
    }
}
