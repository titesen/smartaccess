import type { Logger } from 'winston';
import { config } from '../config.js';
import { DevicePool } from '../devices/device-pool.js';
import { EventPublisher } from '../events/event-publisher.js';
import {
    createDeviceConnected,
    createDeviceDisconnected,
    createTelemetryReported,
    createAlertTriggered,
} from '../events/event-factory.js';

// ---------------------------------------------------------------------------
// Alert thresholds
// ---------------------------------------------------------------------------

const THRESHOLDS = {
    cpu: 85,
    memory: 90,
    temperature: 60,
} as const;

// ---------------------------------------------------------------------------
// SimulationEngine
// ---------------------------------------------------------------------------

export class SimulationEngine {
    private pool: DevicePool;
    private publisher: EventPublisher;
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;

    constructor(
        private readonly logger: Logger,
    ) {
        this.pool = new DevicePool();
        this.publisher = new EventPublisher(logger);
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    async start(): Promise<void> {
        this.logger.info('Initializing simulation engine...', {
            deviceCount: config.simulation.deviceCount,
            telemetryIntervalMs: config.simulation.telemetryIntervalMs,
        });

        // 1. Connect publisher
        await this.publisher.connect();

        // 2. Seed device pool
        this.pool.init(config.simulation.deviceCount);
        this.logger.info(`${config.simulation.deviceCount} virtual devices created`);

        // 3. Connect all devices initially (REGISTERED → ONLINE)
        await this.connectAllDevices();

        // 4. Start periodic simulation loop
        this.running = true;
        this.timer = setInterval(() => {
            this.tick().catch((err) => {
                this.logger.error('Simulation tick failed', {
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }, config.simulation.telemetryIntervalMs);

        this.logger.info('Simulation engine running');
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.publisher.disconnect();
        this.logger.info('Simulation engine stopped');
    }

    // -----------------------------------------------------------------------
    // Internal — initial connection
    // -----------------------------------------------------------------------

    private async connectAllDevices(): Promise<void> {
        for (const device of this.pool.getAll()) {
            const ok = this.pool.transition(device, 'ONLINE');
            if (ok) {
                const event = createDeviceConnected(device);
                await this.publisher.publish(event);
            }
        }
        this.logger.info('All devices connected');
    }

    // -----------------------------------------------------------------------
    // Internal — main loop tick
    // -----------------------------------------------------------------------

    private async tick(): Promise<void> {
        if (!this.running) return;

        // 1. Maybe toggle a connection (connect/disconnect a random device)
        await this.maybeToggleConnection();

        // 2. Emit telemetry for every ONLINE device
        await this.emitTelemetry();
    }

    private async maybeToggleConnection(): Promise<void> {
        if (Math.random() > config.simulation.connectionToggleProbability) return;

        // 50% chance we connect an offline device, 50% we disconnect an online one
        if (Math.random() < 0.5) {
            const device = this.pool.pickRandom('OFFLINE') || this.pool.pickRandom('ERROR');
            if (device) {
                const ok = this.pool.transition(device, 'ONLINE');
                if (ok) {
                    const event = createDeviceConnected(device);
                    await this.publisher.publish(event);
                    this.logger.info(`Device reconnected: ${device.name}`);
                }
            }
        } else {
            const device = this.pool.pickRandom('ONLINE');
            if (device) {
                const reason = Math.random() < 0.3 ? 'network_timeout' : 'normal';
                const ok = this.pool.transition(device, 'OFFLINE');
                if (ok) {
                    const event = createDeviceDisconnected(device, reason);
                    await this.publisher.publish(event);
                    this.logger.info(`Device disconnected: ${device.name} (${reason})`);
                }
            }
        }
    }

    private async emitTelemetry(): Promise<void> {
        const onlineDevices = this.pool.getOnline();

        for (const device of onlineDevices) {
            const telemetryEvent = createTelemetryReported(device);
            await this.publisher.publish(telemetryEvent);

            // Check thresholds for alerts
            const metrics = telemetryEvent.payload.metrics as Record<string, number>;
            for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
                const value = metrics[metric];
                if (value !== undefined && value > threshold) {
                    if (Math.random() < config.simulation.alertProbability / 0.08) {
                        const alert = createAlertTriggered(
                            device,
                            metric as 'cpu' | 'memory' | 'temperature',
                            value,
                            threshold,
                        );
                        await this.publisher.publish(alert);
                        this.logger.warn(`Alert triggered: ${device.name} — ${metric}=${value} (threshold=${threshold})`);
                    }
                }
            }
        }
    }
}
