import { DeviceStatus } from './device.types.js';

export interface Device {
    id: number;
    deviceUuid: string;
    name: string;
    location: string | null;
    status: DeviceStatus;
    firmwareVersion: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
