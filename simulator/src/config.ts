import dotenv from 'dotenv';

dotenv.config();

export const config = {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://smartaccess:smartaccess@localhost:5672',
        exchange: {
            name: 'smartaccess.events',
            type: 'topic' as const,
        },
    },

    simulation: {
        /** Number of virtual devices to simulate */
        deviceCount: parseInt(process.env.SIM_DEVICE_COUNT || '5', 10),

        /** Interval in ms between telemetry events per device */
        telemetryIntervalMs: parseInt(process.env.SIM_TELEMETRY_INTERVAL_MS || '5000', 10),

        /** Probability (0–1) a device connects/disconnects each cycle */
        connectionToggleProbability: parseFloat(process.env.SIM_CONNECTION_TOGGLE_PROB || '0.05'),

        /** Probability (0–1) telemetry triggers an alert */
        alertProbability: parseFloat(process.env.SIM_ALERT_PROB || '0.08'),

        /** Maximum retry attempts for the simulator publisher */
        maxRetries: parseInt(process.env.SIM_MAX_RETRIES || '5', 10),
    },

    logLevel: process.env.LOG_LEVEL || 'info',
} as const;
