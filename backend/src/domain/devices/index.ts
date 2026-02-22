// ---------------------------------------------------------------------------
// Domain / Devices — barrel export
// ---------------------------------------------------------------------------

export type { Device } from './device.entity.js';
export { DeviceStatus } from './device.types.js';
export { validateTransition, isValidTransition, statusFromEventType } from './device-state-machine.js';
