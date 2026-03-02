export class DomainError extends Error {
    public readonly code: string;
    public readonly context?: Record<string, unknown>;

    constructor(message: string, code: string, context?: Record<string, unknown>) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        if (context !== undefined) {
            this.context = context;
        }
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class DeviceNotFoundError extends DomainError {
    constructor(deviceId: string) {
        super(`Device not found: ${deviceId}`, 'DEVICE_NOT_FOUND', { deviceId });
    }
}

export class EventDuplicateError extends DomainError {
    constructor(idempotencyKey: string) {
        super(`Duplicate event detected: ${idempotencyKey}`, 'EVENT_DUPLICATE', { idempotencyKey });
    }
}

export class InvalidStateTransitionError extends DomainError {
    constructor(from: string, to: string) {
        super(`Invalid state transition: ${from} → ${to}`, 'INVALID_STATE_TRANSITION', { from, to });
    }
}
