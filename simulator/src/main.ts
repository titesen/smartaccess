import winston from 'winston';
import { config } from './config.js';
import { SimulationEngine } from './simulation/simulation-engine.js';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
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
// Main
// ---------------------------------------------------------------------------

const engine = new SimulationEngine(logger);

async function start(): Promise<void> {
    logger.info('Starting SmartAccess Device Simulator...', {
        deviceCount: config.simulation.deviceCount,
        telemetryIntervalMs: config.simulation.telemetryIntervalMs,
    });

    try {
        await engine.start();
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

async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    await engine.stop();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
