/**
 * Builder pattern for constructing event payloads with fluent API.
 *
 * Ensures all required fields are set before building, and provides
 * a clear, chainable interface for constructing complex JSONB payloads.
 *
 * Usage:
 *   const payload = new EventPayloadBuilder('TELEMETRY_REPORTED')
 *     .withDevice(deviceUuid)
 *     .withMetric('cpu_usage', 87.5)
 *     .withMetric('temperature', 42.3)
 *     .withCorrelationId(correlationId)
 *     .build();
 */

interface EventPayload {
    eventType: string;
    deviceUuid: string;
    metrics: Record<string, number>;
    metadata: Record<string, unknown>;
    severity?: string;
    correlationId?: string;
    timestamp: string;
}

export class EventPayloadBuilder {
    private eventType: string;
    private deviceUuid?: string;
    private metrics: Record<string, number> = {};
    private metadata: Record<string, unknown> = {};
    private severity?: string;
    private correlationId?: string;
    private timestamp: string;

    constructor(eventType: string) {
        this.eventType = eventType;
        this.timestamp = new Date().toISOString();
    }

    withDevice(deviceUuid: string): this {
        this.deviceUuid = deviceUuid;
        return this;
    }

    withMetric(name: string, value: number): this {
        this.metrics[name] = value;
        return this;
    }

    withMetrics(metrics: Record<string, number>): this {
        Object.assign(this.metrics, metrics);
        return this;
    }

    withMetadata(key: string, value: unknown): this {
        this.metadata[key] = value;
        return this;
    }

    withSeverity(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): this {
        this.severity = severity;
        return this;
    }

    withCorrelationId(correlationId: string): this {
        this.correlationId = correlationId;
        return this;
    }

    withTimestamp(timestamp: string | Date): this {
        this.timestamp = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
        return this;
    }

    /**
     * Validate and build the final payload object.
     * Throws if required fields are missing.
     */
    build(): EventPayload {
        if (!this.eventType) {
            throw new Error('EventPayloadBuilder: eventType is required');
        }
        if (!this.deviceUuid) {
            throw new Error('EventPayloadBuilder: deviceUuid is required (use .withDevice())');
        }

        return {
            eventType: this.eventType,
            deviceUuid: this.deviceUuid,
            metrics: { ...this.metrics },
            metadata: { ...this.metadata },
            ...(this.severity && { severity: this.severity }),
            ...(this.correlationId && { correlationId: this.correlationId }),
            timestamp: this.timestamp,
        };
    }
}
