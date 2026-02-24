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
        if (res.status === 401) {
            logout();
        }
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

export async function fetchEvent(eventUuid: string): Promise<DomainEvent> {
    const res = await request<{ data: DomainEvent }>(`/api/events/${eventUuid}`);
    return res.data;
}

export async function fetchEventsByDevice(deviceId: number, limit = 50): Promise<DomainEvent[]> {
    const res = await request<{ data: DomainEvent[] }>(`/api/events?deviceId=${deviceId}&limit=${limit}`);
    return res.data;
}

export async function retryEvent(eventUuid: string): Promise<void> {
    await request(`/api/events/${eventUuid}/retry`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Dead Letter Queue
// ---------------------------------------------------------------------------

export interface DeadLetterEvent {
    id: number;
    originalEventId: number;
    payload: Record<string, unknown>;
    failureReason: string;
    movedAt: string;
}

export async function fetchDeadLetterEvents(limit = 50): Promise<DeadLetterEvent[]> {
    const res = await request<{ data: DeadLetterEvent[] }>(`/api/events/dlq?limit=${limit}`);
    return res.data;
}

// ---------------------------------------------------------------------------
// Device Status History
// ---------------------------------------------------------------------------

export interface StatusHistoryEntry {
    id: number;
    deviceId: number;
    previousStatus: string;
    newStatus: string;
    changedAt: string;
    changedBy: string;
}

export async function fetchDeviceStatusHistory(deviceId: number): Promise<StatusHistoryEntry[]> {
    const res = await request<{ data: StatusHistoryEntry[] }>(`/api/devices/${deviceId}/history`);
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
    }>('/api/health');
}

// ---------------------------------------------------------------------------
// Alerts (sourced from audit_log with category = DOMAIN)
// ---------------------------------------------------------------------------

export interface Alert {
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
    severity: string;
    correlationId: string | null;
    createdAt: string;
    acknowledged: boolean;
}

export async function fetchAlerts(limit = 50): Promise<Alert[]> {
    const res = await request<{ data: Alert[] }>(`/api/alerts?limit=${limit}`);
    return res.data;
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
    await request(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------

export interface User {
    id: number;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export async function fetchUsers(): Promise<User[]> {
    const res = await request<{ data: User[] }>('/api/admin/users');
    return res.data;
}

export async function createUser(data: { email: string; password: string; role: string }): Promise<User> {
    const res = await request<{ data: User }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.data;
}

export async function updateUser(userId: number, data: { role?: string; isActive?: boolean }): Promise<User> {
    const res = await request<{ data: User }>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
    return res.data;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface AuditEntry {
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    category: string;
    details: Record<string, unknown>;
    correlationId: string | null;
    performedBy: string | null;
    createdAt: string;
}

export async function fetchAuditLog(limit = 100): Promise<AuditEntry[]> {
    const res = await request<{ data: AuditEntry[] }>(`/api/audit?limit=${limit}`);
    return res.data;
}

// ---------------------------------------------------------------------------
// Metrics summary (simple proxy to backend stats)
// ---------------------------------------------------------------------------

export interface MetricsSummary {
    uptime: number;
    eventsProcessed: number;
    eventsFailed: number;
    devicesOnline: number;
    devicesTotal: number;
    dlqSize: number;
    avgProcessingMs: number;
}

export async function fetchMetricsSummary(): Promise<MetricsSummary> {
    return request<MetricsSummary>('/api/metrics/summary');
}

export { ApiError };
