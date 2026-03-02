import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

function readSecret(path: string): string | undefined {
    try {
        return fs.readFileSync(path, 'utf-8').trim();
    } catch {
        return undefined;
    }
}

const dbPass = readSecret('/run/secrets/db_password') || process.env.POSTGRES_PASSWORD || 'smartaccess';
const dbUser = process.env.POSTGRES_USER || 'smartaccess';
const dbHost = process.env.POSTGRES_HOST || 'localhost';
const dbPort = process.env.POSTGRES_PORT || '5432';
const dbName = process.env.POSTGRES_DB || 'smartaccess';
const databaseUrl = process.env.DATABASE_URL || `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;

const mqPass = readSecret('/run/secrets/mq_password') || process.env.RABBITMQ_DEFAULT_PASS || 'smartaccess';
const mqUser = process.env.RABBITMQ_DEFAULT_USER || 'smartaccess';
const mqHost = process.env.RABBITMQ_HOST || 'localhost';
const mqPort = process.env.RABBITMQ_PORT || '5672';
const rabbitmqUrl = process.env.RABBITMQ_URL || `amqp://${mqUser}:${mqPass}@${mqHost}:${mqPort}`;

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',

    database: { url: databaseUrl },
    rabbitmq: { url: rabbitmqUrl },
    
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-in-production',
        expiration: process.env.JWT_EXPIRATION || '15m',
    },

    // ── Future-Ready Stubs (2026 Best Practices) ──────────────────────
    semanticCache: { enabled: process.env.SEMANTIC_CACHE_ENABLED === 'true' },
    mcp: { enabled: process.env.MCP_ENABLED === 'true' },
    pqc: { enabled: process.env.PQC_ENABLED === 'true' },
} as const;
