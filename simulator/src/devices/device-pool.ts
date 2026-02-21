import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceStatus = 'REGISTERED' | 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';

export interface SimulatedDevice {
    deviceUuid: string;
    name: string;
    location: string;
    status: DeviceStatus;
    firmwareVersion: string;
}

// ---------------------------------------------------------------------------
// Allowed transitions (mirrors backend business rules)
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<DeviceStatus, DeviceStatus[]> = {
    REGISTERED: ['ONLINE', 'OFFLINE'],
    ONLINE: ['OFFLINE', 'ERROR', 'MAINTENANCE'],
    OFFLINE: ['ONLINE', 'ERROR', 'MAINTENANCE'],
    ERROR: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
    MAINTENANCE: ['ONLINE', 'OFFLINE'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCATIONS = [
    'Building A – Floor 1',
    'Building A – Floor 2',
    'Building B – Lobby',
    'Warehouse North',
    'Warehouse South',
    'Parking Level -1',
    'Rooftop Sensor Array',
    'Server Room',
];

const FIRMWARE_VERSIONS = ['1.0.0', '1.1.0', '1.2.3', '2.0.0-beta', '2.0.0'];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// DevicePool
// ---------------------------------------------------------------------------

export class DevicePool {
    private devices: SimulatedDevice[] = [];

    /** Seed the pool with `count` devices in REGISTERED status. */
    init(count: number): void {
        this.devices = Array.from({ length: count }, (_, i) => ({
            deviceUuid: crypto.randomUUID(),
            name: `sensor-${String(i + 1).padStart(3, '0')}`,
            location: pick(LOCATIONS),
            status: 'REGISTERED' as DeviceStatus,
            firmwareVersion: pick(FIRMWARE_VERSIONS),
        }));
    }

    getAll(): readonly SimulatedDevice[] {
        return this.devices;
    }

    getOnline(): SimulatedDevice[] {
        return this.devices.filter((d) => d.status === 'ONLINE');
    }

    /** Attempt to transition a device to a new status. Returns true if valid. */
    transition(device: SimulatedDevice, newStatus: DeviceStatus): boolean {
        const allowed = ALLOWED_TRANSITIONS[device.status];
        if (!allowed || !allowed.includes(newStatus)) return false;
        device.status = newStatus;
        return true;
    }

    /** Pick a random device (optionally filtered by status). */
    pickRandom(status?: DeviceStatus): SimulatedDevice | undefined {
        const pool = status ? this.devices.filter((d) => d.status === status) : this.devices;
        if (pool.length === 0) return undefined;
        return pick(pool);
    }
}
