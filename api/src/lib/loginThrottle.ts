/**
 * In-memory limiter for failed sign-ins, keyed by student code. A 4-character passcode is
 * small enough to brute-force without it. Per-process state is acceptable for a single API
 * instance; a multi-instance deployment would need a shared store.
 */
export class LoginThrottle {
  private readonly failures = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly maxFailures = 8,
    private readonly windowMs = 10 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Seconds the caller must wait, or 0 when an attempt is allowed. */
  retryAfterSeconds(key: string): number {
    const entry = this.failures.get(key);
    if (!entry) return 0;
    if (entry.resetAt <= this.now()) {
      this.failures.delete(key);
      return 0;
    }
    return entry.count >= this.maxFailures
      ? Math.ceil((entry.resetAt - this.now()) / 1000)
      : 0;
  }

  recordFailure(key: string): void {
    const entry = this.failures.get(key);
    if (!entry || entry.resetAt <= this.now()) {
      this.failures.set(key, { count: 1, resetAt: this.now() + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}
