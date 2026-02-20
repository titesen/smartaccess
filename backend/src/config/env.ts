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
        expiration: process.env.JWT_EXPIRATION || '1h',
    },
} as const;
