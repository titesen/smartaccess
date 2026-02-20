import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';
import { connectDatabase, getDatabaseHealth, disconnectDatabase } from './infrastructure/database/connection.js';
import { connectBroker, getBrokerHealth, disconnectBroker } from './infrastructure/broker/connection.js';
import { connectCache, getCacheHealth, disconnectCache } from './infrastructure/cache/connection.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', async (_req, res) => {
    const [database, rabbitmq, redis] = await Promise.all([
        getDatabaseHealth(),
        getBrokerHealth(),
        getCacheHealth(),
    ]);

    const isHealthy = database === 'ok' && rabbitmq === 'ok' && redis === 'ok';

    res.status(isHealthy ? 200 : 503).json({
        service: 'smartaccess-backend',
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
            database,
            rabbitmq,
            redis,
        },
    });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
    logger.info('Starting SmartAccess Backend...', { env: env.nodeEnv });

    try {
        await connectDatabase();
        await connectBroker();
        await connectCache();
    } catch (err) {
        logger.error('Failed to connect to infrastructure', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    app.listen(env.port, () => {
        logger.info(`Backend listening on port ${env.port}`);
    });
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    try {
        await disconnectBroker();
        await disconnectCache();
        await disconnectDatabase();
    } catch (err) {
        logger.error('Error during shutdown', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
