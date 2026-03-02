import dotenv from 'dotenv';

dotenv.config();

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',

    database: {
        url: process.env.DATABASE_URL || 'postgres://smartaccess:smartaccess@localhost:5432/smartaccess',
    },

    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://smartaccess:smartaccess@localhost:5672',
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-in-production',
        expiration: process.env.JWT_EXPIRATION || '15m',
    },

    // ── Future-Ready Stubs (2026 Best Practices) ──────────────────────
    // §4.3 — Semantic Caching: enable to vectorize queries for similarity-based cache hits
    semanticCache: {
        enabled: process.env.SEMANTIC_CACHE_ENABLED === 'true',
    },
    // §4.1 — Model Context Protocol: enable to expose MCP-compatible tool endpoints for AI agents
    mcp: {
        enabled: process.env.MCP_ENABLED === 'true',
    },
    // §5.2 — Post-Quantum Cryptography: enable when Node.js supports hybrid key exchange (Kyber)
    pqc: {
        enabled: process.env.PQC_ENABLED === 'true',
    },
} as const;
