// ---------------------------------------------------------------------------
// API client for SmartAccess backend
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, body.error?.message || body.error || res.statusText);
    }

    return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string) {
    const result = await request<{ data: { token: string; user: { id: number; email: string; role: string } } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
    return result.data;
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

export function getStoredUser(): { id: number; email: string; role: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export interface Device {
    id: number;
    deviceUuid: string;
    name: string;
    location: string | null;
    status: string;
    firmwareVersion: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export async function fetchDevices(): Promise<Device[]> {
    const res = await request<{ data: Device[] }>('/api/devices');
    return res.data;
}

export async function fetchDevice(uuid: string): Promise<Device> {
    const res = await request<{ data: Device }>(`/api/devices/${uuid}`);
    return res.data;
}

export async function updateDeviceStatus(uuid: string, status: string): Promise<Device> {
    const res = await request<{ data: Device }>(`/api/devices/${uuid}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    return res.data;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface DomainEvent {
    id: number;
    eventUuid: string;
    deviceId: number;
    eventType: string;
    payload: Record<string, unknown>;
    receivedAt: string;
    processingStatus: string;
    retryCount: number;
    idempotencyKey: string;
    createdAt: string;
}

export async function fetchEvents(limit = 50, offset = 0): Promise<DomainEvent[]> {
    const res = await request<{ data: DomainEvent[] }>(`/api/events?limit=${limit}&offset=${offset}`);
    return res.data;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function fetchHealth() {
    return request<{
        service: string;
        status: string;
        timestamp: string;
        checks: { database: string; rabbitmq: string; redis: string };
    }>('/health');
}

export { ApiError };
