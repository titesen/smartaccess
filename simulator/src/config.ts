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

const mqPass = readSecret('/run/secrets/mq_password') || process.env.RABBITMQ_DEFAULT_PASS || 'smartaccess';
const mqUser = process.env.RABBITMQ_DEFAULT_USER || 'smartaccess';
const mqHost = process.env.RABBITMQ_HOST || 'localhost';
const mqPort = process.env.RABBITMQ_PORT || '5672';
const rabbitmqUrl = process.env.RABBITMQ_URL || `amqp://${mqUser}:${mqPass}@${mqHost}:${mqPort}`;

export const config = {
    rabbitmq: {
        url: rabbitmqUrl,
        exchange: {
            name: 'smartaccess.events',
            type: 'topic' as const,
        },
    },

    simulation: {
        deviceCount: parseInt(process.env.SIM_DEVICE_COUNT || '5', 10),
        telemetryIntervalMs: parseInt(process.env.SIM_TELEMETRY_INTERVAL_MS || '5000', 10),
        connectionToggleProbability: parseFloat(process.env.SIM_CONNECTION_TOGGLE_PROB || '0.05'),
        alertProbability: parseFloat(process.env.SIM_ALERT_PROB || '0.08'),
        maxRetries: parseInt(process.env.SIM_MAX_RETRIES || '5', 10),
    },

    logLevel: process.env.LOG_LEVEL || 'info',
} as const;
