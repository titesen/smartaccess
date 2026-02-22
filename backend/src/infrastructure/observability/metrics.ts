import { Pool } from 'pg';
import { getPool } from '../database/connection.js';
import { logger } from '../../shared/logger/logger.js';

/**
 * Prometheus-compatible metrics endpoint (/metrics).
 *
 * Exposes application metrics in Prometheus text exposition format.
 * This lightweight implementation avoids the heavyweight prom-client library
 * for this MVP while remaining fully compatible with Prometheus scraping.
 */

interface MetricValue {
    name: string;
    help: string;
    type: 'gauge' | 'counter' | 'histogram';
    value: number;
    labels?: Record<string, string>;
}

let requestCount = 0;
let errorCount = 0;
let eventProcessedCount = 0;
let eventFailedCount = 0;
const startTime = Date.now();

/**
 * Increment the request counter. Call from middleware.
 */
export function incRequestCount(): void {
    requestCount++;
}

/**
 * Increment the error counter. Call from error handler middleware.
 */
export function incErrorCount(): void {
    errorCount++;
}

/**
 * Increment processed event counter.
 */
export function incEventProcessed(): void {
    eventProcessedCount++;
}

/**
 * Increment failed event counter.
 */
export function incEventFailed(): void {
    eventFailedCount++;
}

/**
 * Gather all metrics, including dynamic ones from the database.
 */
async function gatherMetrics(): Promise<MetricValue[]> {
    const pool: Pool = getPool();
    const metrics: MetricValue[] = [];

    // Process uptime
    metrics.push({
        name: 'smartaccess_uptime_seconds',
        help: 'Seconds since process started',
        type: 'gauge',
        value: Math.floor((Date.now() - startTime) / 1000),
    });

    // HTTP request count
    metrics.push({
        name: 'smartaccess_http_requests_total',
        help: 'Total HTTP requests handled',
        type: 'counter',
        value: requestCount,
    });

    // HTTP error count
    metrics.push({
        name: 'smartaccess_http_errors_total',
        help: 'Total HTTP errors',
        type: 'counter',
        value: errorCount,
    });

    // Events processed/failed
    metrics.push({
        name: 'smartaccess_events_processed_total',
        help: 'Total events successfully processed',
        type: 'counter',
        value: eventProcessedCount,
    });

    metrics.push({
        name: 'smartaccess_events_failed_total',
        help: 'Total events that failed processing',
        type: 'counter',
        value: eventFailedCount,
    });

    // Database metrics
    try {
        const deviceCounts = await pool.query(
            `SELECT status, COUNT(*)::int as count FROM devices GROUP BY status`,
        );
        for (const row of deviceCounts.rows) {
            metrics.push({
                name: 'smartaccess_devices_by_status',
                help: 'Number of devices by status',
                type: 'gauge',
                value: row.count,
                labels: { status: row.status },
            });
        }

        const eventCounts = await pool.query(
            `SELECT processing_status, COUNT(*)::int as count FROM events GROUP BY processing_status`,
        );
        for (const row of eventCounts.rows) {
            metrics.push({
                name: 'smartaccess_events_by_status',
                help: 'Number of events by processing status',
                type: 'gauge',
                value: row.count,
                labels: { status: row.processing_status },
            });
        }

        const dlqCount = await pool.query(
            `SELECT COUNT(*)::int as count FROM dead_letter_events`,
        );
        metrics.push({
            name: 'smartaccess_dead_letter_events_total',
            help: 'Total events in dead letter queue',
            type: 'gauge',
            value: dlqCount.rows[0]?.count ?? 0,
        });

        const outboxPending = await pool.query(
            `SELECT COUNT(*)::int as count FROM outbox WHERE published = false`,
        );
        metrics.push({
            name: 'smartaccess_outbox_pending',
            help: 'Unpublished messages in outbox',
            type: 'gauge',
            value: outboxPending.rows[0]?.count ?? 0,
        });
    } catch (err) {
        logger.error('Failed to gather database metrics', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    // Connection pool metrics
    metrics.push({
        name: 'smartaccess_pg_pool_total',
        help: 'Total connections in PG pool',
        type: 'gauge',
        value: pool.totalCount,
    });
    metrics.push({
        name: 'smartaccess_pg_pool_idle',
        help: 'Idle connections in PG pool',
        type: 'gauge',
        value: pool.idleCount,
    });
    metrics.push({
        name: 'smartaccess_pg_pool_waiting',
        help: 'Waiting clients in PG pool',
        type: 'gauge',
        value: pool.waitingCount,
    });

    return metrics;
}

/**
 * Format metrics in Prometheus text exposition format.
 */
function formatPrometheus(metrics: MetricValue[]): string {
    const lines: string[] = [];

    for (const metric of metrics) {
        lines.push(`# HELP ${metric.name} ${metric.help}`);
        lines.push(`# TYPE ${metric.name} ${metric.type}`);

        if (metric.labels && Object.keys(metric.labels).length > 0) {
            const labelStr = Object.entries(metric.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            lines.push(`${metric.name}{${labelStr}} ${metric.value}`);
        } else {
            lines.push(`${metric.name} ${metric.value}`);
        }
    }

    return lines.join('\n') + '\n';
}

/**
 * Express handler for GET /metrics
 */
export async function metricsHandler(
    _req: unknown,
    res: { set: (h: string, v: string) => void; send: (b: string) => void },
): Promise<void> {
    const metrics = await gatherMetrics();
    const body = formatPrometheus(metrics);
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(body);
}
