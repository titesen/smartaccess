import winston from 'winston';
import { env } from '../../config/env.js';

export const logger = winston.createLogger({
    level: env.logLevel,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    defaultMeta: {
        service: 'smartaccess-backend',
    },
    transports: [
        new winston.transports.Console({
            format:
                env.nodeEnv === 'development'
                    ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                    : winston.format.json(),
        }),
    ],
});
