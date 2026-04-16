export class RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Attempts to consume a token for a given key (e.g. IP or Organization ID)
   * Returns true if allowed, false if rate limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      // Create new window
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false; // Rate limited
    }

    // Increment window count
    record.count += 1;
    return true;
  }
}
