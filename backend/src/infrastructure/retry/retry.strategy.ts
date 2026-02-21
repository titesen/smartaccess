// ---------------------------------------------------------------------------
// Retry strategies (Strategy Pattern)
// ---------------------------------------------------------------------------

export interface RetryStrategy {
    /** Calculate delay in ms for the given attempt number (1-based). */
    getDelay(attempt: number): number;
}

/**
 * Exponential backoff: delay = baseDelayMs * 2^(attempt-1), capped at maxDelayMs.
 * With optional jitter.
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
    constructor(
        private readonly baseDelayMs: number = 1000,
        private readonly maxDelayMs: number = 60_000,
        private readonly jitter: boolean = true,
    ) { }

    getDelay(attempt: number): number {
        const exponential = this.baseDelayMs * Math.pow(2, attempt - 1);
        const capped = Math.min(exponential, this.maxDelayMs);
        if (!this.jitter) return capped;
        // Add ±25% jitter
        const jitterRange = capped * 0.25;
        return Math.floor(capped + (Math.random() * 2 - 1) * jitterRange);
    }
}

/**
 * Fixed delay: always returns the same delay.
 */
export class FixedDelayStrategy implements RetryStrategy {
    constructor(private readonly delayMs: number = 5000) { }

    getDelay(_attempt: number): number {
        return this.delayMs;
    }
}

/**
 * Linear backoff: delay = baseDelayMs * attempt.
 */
export class LinearBackoffStrategy implements RetryStrategy {
    constructor(
        private readonly baseDelayMs: number = 2000,
        private readonly maxDelayMs: number = 30_000,
    ) { }

    getDelay(attempt: number): number {
        return Math.min(this.baseDelayMs * attempt, this.maxDelayMs);
    }
}
