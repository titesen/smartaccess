import { describe, it, expect } from 'vitest';
import {
    ExponentialBackoffStrategy,
    FixedDelayStrategy,
    LinearBackoffStrategy,
} from '../retry.strategy.js';

describe('RetryStrategies', () => {
    describe('ExponentialBackoffStrategy', () => {
        it('should double delay each attempt (without jitter)', () => {
            const strategy = new ExponentialBackoffStrategy(1000, 60000, false);
            expect(strategy.getDelay(1)).toBe(1000);
            expect(strategy.getDelay(2)).toBe(2000);
            expect(strategy.getDelay(3)).toBe(4000);
            expect(strategy.getDelay(4)).toBe(8000);
        });

        it('should cap at maxDelayMs', () => {
            const strategy = new ExponentialBackoffStrategy(1000, 5000, false);
            expect(strategy.getDelay(10)).toBe(5000);
        });

        it('should add jitter when enabled', () => {
            const strategy = new ExponentialBackoffStrategy(1000, 60000, true);
            const delay = strategy.getDelay(1);
            // With ±25% jitter, delay should be between 750 and 1250
            expect(delay).toBeGreaterThanOrEqual(750);
            expect(delay).toBeLessThanOrEqual(1250);
        });
    });

    describe('FixedDelayStrategy', () => {
        it('should always return the same delay', () => {
            const strategy = new FixedDelayStrategy(5000);
            expect(strategy.getDelay(1)).toBe(5000);
            expect(strategy.getDelay(5)).toBe(5000);
            expect(strategy.getDelay(100)).toBe(5000);
        });
    });

    describe('LinearBackoffStrategy', () => {
        it('should increase linearly', () => {
            const strategy = new LinearBackoffStrategy(2000, 30000);
            expect(strategy.getDelay(1)).toBe(2000);
            expect(strategy.getDelay(2)).toBe(4000);
            expect(strategy.getDelay(5)).toBe(10000);
        });

        it('should cap at maxDelayMs', () => {
            const strategy = new LinearBackoffStrategy(2000, 8000);
            expect(strategy.getDelay(10)).toBe(8000);
        });
    });
});
