import amqplib from 'amqplib';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';

let connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;

export async function connectBroker(): Promise<void> {
    if (!connection) {
        connection = await amqplib.connect(env.rabbitmq.url);

        connection.on('error', (err: Error) => {
            logger.error('RabbitMQ connection error', { error: err.message });
            connection = null;
        });

        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
            connection = null;
        });

        logger.info('RabbitMQ connected successfully');
    }
}

export function getConnection(): typeof connection {
    return connection;
}

export async function getBrokerHealth(): Promise<'ok' | 'error'> {
    try {
        if (!connection) {
            return 'error';
        }
        return 'ok';
    } catch {
        return 'error';
    }
}

export async function disconnectBroker(): Promise<void> {
    if (connection) {
        try {
            await connection.close();
        } catch {
            // Already closed
        }
        connection = null;
        logger.info('RabbitMQ disconnected');
    }
}
