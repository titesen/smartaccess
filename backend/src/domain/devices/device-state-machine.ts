import { DeviceStatus } from './device.types.js';
import { InvalidStateTransitionError } from '../../shared/errors/domain.error.js';

// ---------------------------------------------------------------------------
// Valid transitions matrix (from business_rules.md BR-STATE-001 to BR-STATE-004)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<DeviceStatus, DeviceStatus[]> = {
    [DeviceStatus.REGISTERED]: [DeviceStatus.ONLINE, DeviceStatus.DECOMMISSIONED],
    [DeviceStatus.ONLINE]: [
        DeviceStatus.OFFLINE,
        DeviceStatus.ERROR,
        DeviceStatus.MAINTENANCE,
        DeviceStatus.DECOMMISSIONED,
    ],
    [DeviceStatus.OFFLINE]: [
        DeviceStatus.ONLINE,
        DeviceStatus.ERROR,
        DeviceStatus.MAINTENANCE,
        DeviceStatus.DECOMMISSIONED,
    ],
    [DeviceStatus.ERROR]: [
        DeviceStatus.ONLINE,
        DeviceStatus.OFFLINE,
        DeviceStatus.MAINTENANCE,
        DeviceStatus.DECOMMISSIONED,
    ],
    [DeviceStatus.MAINTENANCE]: [
        DeviceStatus.ONLINE,
        DeviceStatus.OFFLINE,
        DeviceStatus.DECOMMISSIONED,
    ],
    [DeviceStatus.DECOMMISSIONED]: [], // terminal state — no transitions allowed
};

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Validate that a device status transition is allowed per the business rules.
 * Throws `InvalidStateTransitionError` if the transition is invalid.
 */
export function validateTransition(from: DeviceStatus, to: DeviceStatus): void {
    // BR-STATE-003: no self-transition
    if (from === to) {
        throw new InvalidStateTransitionError(from, to);
    }

    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
        throw new InvalidStateTransitionError(from, to);
    }
}

/**
 * Check if a transition is valid without throwing.
 */
export function isValidTransition(from: DeviceStatus, to: DeviceStatus): boolean {
    if (from === to) return false;
    const allowed = VALID_TRANSITIONS[from];
    return !!allowed && allowed.includes(to);
}

/**
 * Map event types to the expected device status after the event.
 */
export function statusFromEventType(eventType: string): DeviceStatus | null {
    switch (eventType) {
        case 'DEVICE_CONNECTED':
            return DeviceStatus.ONLINE;
        case 'DEVICE_DISCONNECTED':
            return DeviceStatus.OFFLINE;
        default:
            return null; // no status change expected for telemetry, alerts, commands
    }
}
