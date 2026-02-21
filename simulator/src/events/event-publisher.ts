import amqplib from 'amqplib';
import { config } from '../config.js';
import type { SimulatorEvent } from './event-factory.js';
import type { Logger } from 'winston';

// ---------------------------------------------------------------------------
// Routing key mapping
// ---------------------------------------------------------------------------

const ROUTING_KEYS: Record<string, string> = {
    DEVICE_CONNECTED: 'device.connected',
    DEVICE_DISCONNECTED: 'device.disconnected',
    TELEMETRY_REPORTED: 'telemetry.reported',
    ALERT_TRIGGERED: 'alert.triggered',
    COMMAND_RECEIVED: 'command.received',
    COMMAND_EXECUTED: 'command.executed',
};

// ---------------------------------------------------------------------------
// EventPublisher
// ---------------------------------------------------------------------------

export class EventPublisher {
    private connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;
    private channel: amqplib.Channel | null = null;

    constructor(private readonly logger: Logger) { }

    async connect(): Promise<void> {
        this.connection = await amqplib.connect(config.rabbitmq.url);
        this.logger.info('Publisher connected to RabbitMQ');

        this.connection.on('error', (err: Error) => {
            this.logger.error('Publisher RabbitMQ connection error', { error: err.message });
            this.connection = null;
            this.channel = null;
        });

        this.connection.on('close', () => {
            this.logger.warn('Publisher RabbitMQ connection closed');
            this.connection = null;
            this.channel = null;
        });

        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange(
            config.rabbitmq.exchange.name,
            config.rabbitmq.exchange.type,
            { durable: true },
        );
        this.logger.info(
            `Exchange "${config.rabbitmq.exchange.name}" (${config.rabbitmq.exchange.type}) asserted`,
        );
    }

    /** Publish a single event to the exchange. */
    async publish(event: SimulatorEvent): Promise<boolean> {
        if (!this.channel) {
            this.logger.error('Cannot publish — channel not available');
            return false;
        }

        const routingKey = ROUTING_KEYS[event.eventType] || 'unknown';
        const body = Buffer.from(JSON.stringify(event));

        const published = this.channel.publish(
            config.rabbitmq.exchange.name,
            routingKey,
            body,
            {
                persistent: true,
                contentType: 'application/json',
                messageId: event.eventUuid,
                headers: {
                    idempotency_key: event.idempotencyKey,
                },
            },
        );

        if (published) {
            this.logger.debug('Event published', {
                eventUuid: event.eventUuid,
                eventType: event.eventType,
                routingKey,
                deviceUuid: event.deviceUuid,
            });
        } else {
            this.logger.warn('Channel write buffer full — event queued internally', {
                eventUuid: event.eventUuid,
            });
        }

        return published;
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
        } catch {
            // already closed
        }
        try {
            if (this.connection) await this.connection.close();
        } catch {
            // already closed
        }
        this.channel = null;
        this.connection = null;
        this.logger.info('Publisher disconnected from RabbitMQ');
    }
}
