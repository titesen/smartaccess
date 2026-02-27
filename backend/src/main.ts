import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';
import { connectDatabase, getDatabaseHealth, disconnectDatabase } from './infrastructure/database/connection.js';
import { connectBroker, getBrokerHealth, disconnectBroker } from './infrastructure/broker/connection.js';
import { connectCache, getCacheHealth, disconnectCache } from './infrastructure/cache/connection.js';

// Repositories
import { PgDeviceRepository } from './infrastructure/repositories/device.repository.js';
import { PgEventRepository } from './infrastructure/repositories/event.repository.js';
import { PgAuditRepository } from './infrastructure/repositories/audit.repository.js';
import { PgEventProcessingLogRepository } from './infrastructure/repositories/event-processing-log.repository.js';
import { PgOutboxRepository } from './infrastructure/outbox/outbox.repository.js';
import { PgUserRepository } from './infrastructure/repositories/user.repository.js';

// Adapters
import { RabbitMQAdapter } from './infrastructure/adapters/broker.adapter.js';
import { RedisCacheAdapter } from './infrastructure/adapters/cache.adapter.js';

// Application — services
import { EventProcessingService } from './application/services/event-processing.service.js';
import { DlqService } from './application/services/dlq.service.js';
import { DeviceService } from './application/services/device.service.js';
import { AuthService } from './application/services/auth.service.js';
import { AlertService } from './application/services/alert.service.js';
import { EventConsumer } from './application/consumers/event.consumer.js';

// Infrastructure — resilience
import { OutboxProcessor } from './infrastructure/outbox/outbox.processor.js';

// Routes
import { createDeviceRoutes } from './application/routes/device.routes.js';
import { createEventRoutes } from './application/routes/event.routes.js';
import { createAuthRoutes } from './application/routes/auth.routes.js';
import { createAlertRoutes } from './application/routes/alert.routes.js';
import { createMetricRoutes } from './application/routes/metric.routes.js';

// Middleware
import { errorHandler } from './application/middleware/error-handler.js';
import { requestLogger } from './application/middleware/request-logger.js';
import { createAuthMiddleware } from './application/middleware/auth.middleware.js';
import { requireRole } from './application/middleware/rbac.middleware.js';

// Domain
import { UserRole } from './domain/auth/auth.types.js';

// WebSocket
import { WebSocketGateway } from './infrastructure/websocket/ws-gateway.js';

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Dependency Injection (Poor Man's DI)
// ---------------------------------------------------------------------------

const deviceRepo = new PgDeviceRepository();
const eventRepo = new PgEventRepository();
const auditRepo = new PgAuditRepository();
const processingLogRepo = new PgEventProcessingLogRepository();
const outboxRepo = new PgOutboxRepository();
const userRepo = new PgUserRepository();
const brokerAdapter = new RabbitMQAdapter();
const cacheAdapter = new RedisCacheAdapter();
const wsGateway = new WebSocketGateway(server, logger);

const dlqService = new DlqService(eventRepo, auditRepo);

const eventProcessingService = new EventProcessingService(
    deviceRepo,
    eventRepo,
    auditRepo,
    processingLogRepo,
    cacheAdapter,
    wsGateway,
    dlqService,
);

const deviceService = new DeviceService(deviceRepo, cacheAdapter);
const authService = new AuthService(userRepo, auditRepo);
const alertService = new AlertService();
const eventConsumer = new EventConsumer(brokerAdapter, eventProcessingService);
const outboxProcessor = new OutboxProcessor(outboxRepo, brokerAdapter);

// Middleware instances
const authMiddleware = createAuthMiddleware(authService);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Public Routes
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
        checks: { database, rabbitmq, redis },
    });
});

app.use('/api/auth', createAuthRoutes(authService));

// ---------------------------------------------------------------------------
// Protected Routes (require JWT)
// ---------------------------------------------------------------------------

app.use('/api/devices', authMiddleware, createDeviceRoutes(deviceService));
app.use('/api/events', authMiddleware, requireRole(UserRole.ADMIN, UserRole.OPERATOR), createEventRoutes(eventRepo));
app.use('/api/alerts', authMiddleware, createAlertRoutes(alertService));
app.use('/api/metrics', authMiddleware, createMetricRoutes());

// Error handler (must be last)
app.use(errorHandler);

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

    // Start event consumer
    try {
        await eventConsumer.start();
        logger.info('Event consumer started');
    } catch (err) {
        logger.error('Failed to start event consumer', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    // Start outbox processor
    outboxProcessor.start();

    // Start HTTP + WebSocket server
    server.listen(env.port, '0.0.0.0', () => {
        logger.info(`Backend listening on 0.0.0.0:${env.port}`);
    });
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    outboxProcessor.stop();
    wsGateway.close();

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

// Export for WebSocket access from services
export { wsGateway };
