import { describe, it, expect } from 'vitest';
import { DomainError, DeviceNotFoundError, EventDuplicateError, InvalidStateTransitionError } from '../domain.error.js';

describe('Domain Errors', () => {
    describe('DomainError', () => {
        it('should set message and code', () => {
            const err = new DomainError('test', 'TEST_CODE');
            expect(err.message).toBe('test');
            expect(err.code).toBe('TEST_CODE');
            expect(err.name).toBe('DomainError');
        });

        it('should include context when provided', () => {
            const err = new DomainError('test', 'TEST', { foo: 'bar' });
            expect(err.context).toEqual({ foo: 'bar' });
        });

        it('should be an instance of Error', () => {
            const err = new DomainError('test', 'TEST');
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(DomainError);
        });
    });

    describe('DeviceNotFoundError', () => {
        it('should set correct code and message', () => {
            const err = new DeviceNotFoundError('device-123');
            expect(err.code).toBe('DEVICE_NOT_FOUND');
            expect(err.message).toContain('device-123');
        });
    });

    describe('EventDuplicateError', () => {
        it('should set correct code', () => {
            const err = new EventDuplicateError('key-abc');
            expect(err.code).toBe('EVENT_DUPLICATE');
            expect(err.context).toEqual({ idempotencyKey: 'key-abc' });
        });
    });

    describe('InvalidStateTransitionError', () => {
        it('should set correct code and include from/to', () => {
            const err = new InvalidStateTransitionError('ONLINE', 'REGISTERED');
            expect(err.code).toBe('INVALID_STATE_TRANSITION');
            expect(err.context).toEqual({ from: 'ONLINE', to: 'REGISTERED' });
        });
    });
});
