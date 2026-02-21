import amqplib from 'amqplib';
import { getConnection } from '../broker/connection.js';
import { logger } from '../../shared/logger/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrokerMessage {
    content: Buffer;
    fields: amqplib.ConsumeMessageFields;
    properties: amqplib.MessageProperties;
}

export type MessageHandler = (msg: BrokerMessage) => Promise<void>;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IBrokerAdapter {
    subscribe(
        exchangeName: string,
        queueName: string,
        routingPattern: string,
        handler: MessageHandler,
        prefetch?: number,
    ): Promise<void>;
    ack(msg: BrokerMessage): void;
    nack(msg: BrokerMessage, requeue?: boolean): void;
    publish(
        exchangeName: string,
        routingKey: string,
        content: Buffer,
        options?: amqplib.Options.Publish,
    ): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// RabbitMQ Implementation
// ---------------------------------------------------------------------------

export class RabbitMQAdapter implements IBrokerAdapter {
    private channel: amqplib.Channel | null = null;

    private async getChannel(): Promise<amqplib.Channel> {
        if (this.channel) return this.channel;
        const conn = getConnection();
        if (!conn) throw new Error('RabbitMQ connection not established');
        this.channel = await conn.createChannel();

        this.channel.on('close', () => {
            logger.warn('RabbitMQ channel closed');
            this.channel = null;
        });
        this.channel.on('error', (err: Error) => {
            logger.error('RabbitMQ channel error', { error: err.message });
            this.channel = null;
        });

        return this.channel;
    }

    async subscribe(
        exchangeName: string,
        queueName: string,
        routingPattern: string,
        handler: MessageHandler,
        prefetch: number = 1,
    ): Promise<void> {
        const ch = await this.getChannel();

        await ch.assertExchange(exchangeName, 'topic', { durable: true });
        await ch.assertQueue(queueName, { durable: true });
        await ch.bindQueue(queueName, exchangeName, routingPattern);
        await ch.prefetch(prefetch);

        logger.info('Consumer subscribed', { queueName, routingPattern, prefetch });

        await ch.consume(queueName, async (msg) => {
            if (!msg) return;
            try {
                await handler({
                    content: msg.content,
                    fields: msg.fields,
                    properties: msg.properties,
                });
            } catch (err) {
                logger.error('Unhandled error in message handler', {
                    error: err instanceof Error ? err.message : String(err),
                    routingKey: msg.fields.routingKey,
                });
                // The handler itself should ack/nack — this is a safety net
                try {
                    ch.nack(msg, false, false);
                } catch {
                    // channel may have closed
                }
            }
        });
    }

    ack(msg: BrokerMessage): void {
        this.getChannel().then((ch) => ch.ack(msg as unknown as amqplib.ConsumeMessage));
    }

    nack(msg: BrokerMessage, requeue: boolean = false): void {
        this.getChannel().then((ch) => ch.nack(msg as unknown as amqplib.ConsumeMessage, false, requeue));
    }

    async publish(
        exchangeName: string,
        routingKey: string,
        content: Buffer,
        options?: amqplib.Options.Publish,
    ): Promise<boolean> {
        const ch = await this.getChannel();
        return ch.publish(exchangeName, routingKey, content, {
            persistent: true,
            contentType: 'application/json',
            ...options,
        });
    }
}
