/**
 * OpenTelemetry tracing configuration.
 *
 * Initializes the OpenTelemetry SDK with:
 * - OTLP exporter (configurable endpoint)
 * - HTTP instrumentation for Express
 * - Custom spans for event processing
 *
 * Import this file at the very top of main.ts to ensure
 * auto-instrumentation captures all HTTP requests.
 *
 * Note: This is a lightweight shim that avoids requiring the full
 * @opentelemetry/* packages during development. Install the packages
 * when deploying to production:
 *   npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 *   npm install @opentelemetry/exporter-trace-otlp-http
 */

import { logger } from '../../shared/logger/logger.js';

interface TracingConfig {
    serviceName: string;
    otlpEndpoint: string;
    enabled: boolean;
}

const DEFAULT_CONFIG: TracingConfig = {
    serviceName: process.env.OTEL_SERVICE_NAME || 'smartaccess-backend',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    enabled: process.env.OTEL_ENABLED === 'true',
};

/**
 * Initialize OpenTelemetry tracing.
 *
 * Attempts to dynamically import the OpenTelemetry SDK.
 * Falls back gracefully if packages are not installed.
 */
export async function initTracing(config: Partial<TracingConfig> = {}): Promise<void> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    if (!cfg.enabled) {
        logger.info('OpenTelemetry tracing disabled (set OTEL_ENABLED=true to enable)');
        return;
    }

    try {
        // Dynamic import — allows app to run without OTel packages installed
        // @ts-ignore — optional dependency, not in package.json
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        // @ts-ignore — optional dependency
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        // @ts-ignore — optional dependency
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        // @ts-ignore — optional dependency
        const { Resource } = await import('@opentelemetry/resources');
        // @ts-ignore — optional dependency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions') as any;

        const traceExporter = new OTLPTraceExporter({
            url: `${cfg.otlpEndpoint}/v1/traces`,
        });

        const sdk = new NodeSDK({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: cfg.serviceName,
            }),
            traceExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-http': { enabled: true },
                    '@opentelemetry/instrumentation-express': { enabled: true },
                    '@opentelemetry/instrumentation-pg': { enabled: true },
                }),
            ],
        });

        sdk.start();

        logger.info('OpenTelemetry tracing initialized', {
            serviceName: cfg.serviceName,
            otlpEndpoint: cfg.otlpEndpoint,
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => logger.info('OpenTelemetry SDK shutdown'))
                .catch((err: Error) => logger.error('OpenTelemetry SDK shutdown error', { error: err.message }));
        });
    } catch (err) {
        logger.warn('OpenTelemetry packages not installed, tracing disabled. Install with: npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http', {
            error: err instanceof Error ? err.message : String(err),
        });
    }
}

// ---------------------------------------------------------------------------
// Manual tracing helpers (for use without full OTel SDK)
// ---------------------------------------------------------------------------

/**
 * Generate a correlation ID for event tracing.
 * Uses crypto.randomUUID when available, falls back to timestamp-based.
 */
export function generateCorrelationId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}

/**
 * Create a trace context header for inter-service communication.
 */
export function createTraceContext(correlationId: string): Record<string, string> {
    return {
        'x-correlation-id': correlationId,
        'x-trace-timestamp': new Date().toISOString(),
        'x-service-name': DEFAULT_CONFIG.serviceName,
    };
}
