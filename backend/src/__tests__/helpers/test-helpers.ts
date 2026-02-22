/**
 * Integration test helpers.
 *
 * Provides utilities for setting up and tearing down test infrastructure
 * (database, mocks) for integration-level tests.
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock logger (silence logs during tests)
// ---------------------------------------------------------------------------

export const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

vi.mock('../../shared/logger/logger.js', () => ({
    logger: mockLogger,
}));

// ---------------------------------------------------------------------------
// Mock database pool
// ---------------------------------------------------------------------------

export function createMockPool() {
    const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
    };

    const mockPool = {
        query: vi.fn(),
        connect: vi.fn().mockResolvedValue(mockClient),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        end: vi.fn(),
    };

    return { mockPool, mockClient };
}

// ---------------------------------------------------------------------------
// Express test helpers
// ---------------------------------------------------------------------------

interface MockRequest {
    body: Record<string, unknown>;
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
    method: string;
    ip?: string;
    headers: Record<string, string>;
}

interface MockResponse {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    statusCode: number;
    _body: unknown;
}

export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
    return {
        body: {},
        params: {},
        query: {},
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        headers: {},
        ...overrides,
    };
}

export function createMockResponse(): MockResponse {
    const res: MockResponse = {
        statusCode: 200,
        _body: null,
        status: vi.fn(),
        json: vi.fn(),
        set: vi.fn(),
        send: vi.fn(),
    };

    // Chain: res.status(400).json({...})
    res.status.mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    });

    res.json.mockImplementation((body: unknown) => {
        res._body = body;
        return res;
    });

    return res;
}

export function createMockNext() {
    return vi.fn();
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

export function createDeviceFixture(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        device_uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Device',
        location: 'Building A',
        status: 'ONLINE',
        firmware_version: '1.0.0',
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

export function createEventFixture(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        event_uuid: '660e8400-e29b-41d4-a716-446655440001',
        device_id: 1,
        event_type: 'TELEMETRY_REPORTED',
        payload: { cpu: 45, memory: 60 },
        received_at: new Date().toISOString(),
        processing_status: 'PENDING',
        retry_count: 0,
        idempotency_key: 'test-key-001',
        created_at: new Date().toISOString(),
        ...overrides,
    };
}
