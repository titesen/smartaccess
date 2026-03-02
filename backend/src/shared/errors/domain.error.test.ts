import { describe, it, expect } from 'vitest';
import {
    DomainError,
    DeviceNotFoundError,
    EventDuplicateError,
    InvalidStateTransitionError,
} from './domain.error.js';

describe('DomainError hierarchy', () => {
    describe('DomainError (base)', () => {
        it('should be an instance of Error', () => {
            const err = new DomainError('msg', 'CODE');
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(DomainError);
        });

        it('should store code and message', () => {
            const err = new DomainError('Something failed', 'GENERAL_FAILURE');
            expect(err.message).toBe('Something failed');
            expect(err.code).toBe('GENERAL_FAILURE');
        });

        it('should store optional context', () => {
            const ctx = { key: 'value' };
            const err = new DomainError('msg', 'CODE', ctx);
            expect(err.context).toEqual(ctx);
        });

        it('should have undefined context when not provided', () => {
            const err = new DomainError('msg', 'CODE');
            expect(err.context).toBeUndefined();
        });
    });

    describe('DeviceNotFoundError', () => {
        it('should include deviceId in message and context', () => {
            const err = new DeviceNotFoundError('abc-123');
            expect(err.code).toBe('DEVICE_NOT_FOUND');
            expect(err.message).toContain('abc-123');
            expect(err.context).toEqual({ deviceId: 'abc-123' });
        });

        it('should extend DomainError', () => {
            expect(new DeviceNotFoundError('x')).toBeInstanceOf(DomainError);
        });
    });

    describe('EventDuplicateError', () => {
        it('should include idempotencyKey in message and context', () => {
            const err = new EventDuplicateError('key-456');
            expect(err.code).toBe('EVENT_DUPLICATE');
            expect(err.message).toContain('key-456');
            expect(err.context).toEqual({ idempotencyKey: 'key-456' });
        });

        it('should extend DomainError', () => {
            expect(new EventDuplicateError('x')).toBeInstanceOf(DomainError);
        });
    });

    describe('InvalidStateTransitionError', () => {
        it('should include from and to states', () => {
            const err = new InvalidStateTransitionError('ONLINE', 'REGISTERED');
            expect(err.code).toBe('INVALID_STATE_TRANSITION');
            expect(err.message).toContain('ONLINE');
            expect(err.message).toContain('REGISTERED');
            expect(err.context).toEqual({ from: 'ONLINE', to: 'REGISTERED' });
        });

        it('should extend DomainError', () => {
            expect(new InvalidStateTransitionError('A', 'B')).toBeInstanceOf(DomainError);
        });
    });
});
