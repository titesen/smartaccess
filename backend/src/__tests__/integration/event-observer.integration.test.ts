import { describe, it, expect, beforeEach } from 'vitest';
import { EventObserver, DomainEvents } from '../../domain/events/event.observer.js';

describe('EventObserver', () => {
    let observer: EventObserver;

    beforeEach(() => {
        observer = new EventObserver();
    });

    it('should register and call a handler', async () => {
        const calls: Record<string, unknown>[] = [];
        observer.on(DomainEvents.EVENT_PROCESSED, (data) => { calls.push(data); });

        await observer.emit(DomainEvents.EVENT_PROCESSED, { eventId: 1 });

        expect(calls).toHaveLength(1);
        expect(calls[0]).toEqual({ eventId: 1 });
    });

    it('should call multiple handlers for the same event', async () => {
        let count = 0;
        observer.on(DomainEvents.DEVICE_STATUS_CHANGED, () => { count++; });
        observer.on(DomainEvents.DEVICE_STATUS_CHANGED, () => { count++; });

        await observer.emit(DomainEvents.DEVICE_STATUS_CHANGED, { deviceId: 1 });

        expect(count).toBe(2);
    });

    it('should not call handlers for different event types', async () => {
        let called = false;
        observer.on(DomainEvents.EVENT_PROCESSED, () => { called = true; });

        await observer.emit(DomainEvents.EVENT_FAILED, { eventId: 1 });

        expect(called).toBe(false);
    });

    it('should handle handler failures without propagating', async () => {
        const calls: string[] = [];
        observer.on(DomainEvents.EVENT_PROCESSED, () => { throw new Error('broken'); });
        observer.on(DomainEvents.EVENT_PROCESSED, () => { calls.push('second'); });

        // Should not throw
        await observer.emit(DomainEvents.EVENT_PROCESSED, { eventId: 1 });

        // Second handler should still execute
        expect(calls).toContain('second');
    });

    it('should remove a handler with off()', async () => {
        let count = 0;
        const handler = () => { count++; };
        observer.on(DomainEvents.EVENT_PROCESSED, handler);
        observer.off(DomainEvents.EVENT_PROCESSED, handler);

        await observer.emit(DomainEvents.EVENT_PROCESSED, { eventId: 1 });

        expect(count).toBe(0);
    });

    it('should do nothing when emitting with no handlers', async () => {
        // Should not throw
        await observer.emit('UNREGISTERED_EVENT', { data: 'test' });
    });

    it('should list registrations correctly', () => {
        observer.on(DomainEvents.EVENT_PROCESSED, () => { });
        observer.on(DomainEvents.EVENT_PROCESSED, () => { });
        observer.on(DomainEvents.DEVICE_STATUS_CHANGED, () => { });

        const regs = observer.listRegistrations();

        expect(regs[DomainEvents.EVENT_PROCESSED]).toBe(2);
        expect(regs[DomainEvents.DEVICE_STATUS_CHANGED]).toBe(1);
    });

    it('should handle async handlers', async () => {
        const results: number[] = [];
        observer.on(DomainEvents.EVENT_PROCESSED, async (data) => {
            await new Promise((r) => setTimeout(r, 10));
            results.push(data.eventId as number);
        });

        await observer.emit(DomainEvents.EVENT_PROCESSED, { eventId: 42 });

        expect(results).toEqual([42]);
    });
});
