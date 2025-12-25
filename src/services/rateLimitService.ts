interface RateLimitConfig { maxRequests: number; windowMs: number; }

class RateLimitService {
  private requests = new Map<string, number[]>();
  private config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 };

  configure(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < this.config.windowMs);
    this.requests.set(key, validTimestamps);
    return validTimestamps.length < this.config.maxRequests;
  }

  recordRequest(key: string = 'default'): void {
    const timestamps = this.requests.get(key) || [];
    timestamps.push(Date.now());
    this.requests.set(key, timestamps);
  }

  getRemainingRequests(key: string = 'default'): number {
    const timestamps = this.requests.get(key) || [];
    const now = Date.now();
    const valid = timestamps.filter(t => now - t < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - valid.length);
  }

  getResetTime(key: string = 'default'): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;
    const oldest = Math.min(...timestamps);
    return Math.max(0, this.config.windowMs - (Date.now() - oldest));
  }

  reset(key?: string): void {
    if (key) this.requests.delete(key);
    else this.requests.clear();
  }
}

export const rateLimitService = new RateLimitService();
export default rateLimitService;
