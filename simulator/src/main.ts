import amqplib from 'amqplib';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    defaultMeta: { service: 'smartaccess-simulator' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://smartaccess:smartaccess@localhost:5672';
const EXCHANGE_NAME = 'smartaccess.events';
const EXCHANGE_TYPE = 'topic';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
    logger.info('Starting SmartAccess Device Simulator...');

    try {
        const connection = await amqplib.connect(RABBITMQ_URL);
        logger.info('Connected to RabbitMQ');

        const channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
        logger.info(`Exchange "${EXCHANGE_NAME}" (${EXCHANGE_TYPE}) asserted`);

        // TODO: Implement device simulation and event generation
        logger.info('Simulator is ready. Event generation not yet implemented.');

        connection.on('error', (err: Error) => {
            logger.error('RabbitMQ connection error', { error: err.message });
        });

        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
        });

        // Keep the process alive
        await new Promise(() => { });
    } catch (err) {
        logger.error('Simulator failed to start', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    process.exit(0);
});

start();
