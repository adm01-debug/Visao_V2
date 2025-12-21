export class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxRequests: number, private windowMs: number) {}

  canMakeRequest(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }
    return false;
  }

  getTimeUntilNext(): number {
    if (this.timestamps.length < this.maxRequests) return 0;
    return this.timestamps[0] + this.windowMs - Date.now();
  }
}

export const apiRateLimiter = new RateLimiter(100, 60000);
