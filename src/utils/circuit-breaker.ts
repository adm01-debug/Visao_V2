/**
 * Circuit Breaker Utility
 */
type State = 'closed' | 'open' | 'half-open';
export class CircuitBreaker {
  private state: State = 'closed';
  private failures = 0;
  private lastFailure = 0;
  constructor(private threshold = 5, private timeout = 30000) {}
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) this.state = 'half-open';
      else throw new Error('Circuit is open');
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'open';
      throw error;
    }
  }
  getState(): State { return this.state; }
  reset(): void { this.state = 'closed'; this.failures = 0; }
}
