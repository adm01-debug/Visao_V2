/**
 * Health Check
 */
export interface HealthStatus { status: 'healthy' | 'degraded' | 'unhealthy'; checks: { name: string; status: string; duration: number }[]; timestamp: Date; }
export class HealthChecker {
  private checks: { name: string; check: () => Promise<boolean> }[] = [];
  register(name: string, check: () => Promise<boolean>): void { this.checks.push({ name, check }); }
  async getStatus(): Promise<HealthStatus> {
    const results = await Promise.all(this.checks.map(async c => {
      const start = performance.now();
      const passed = await c.check().catch(() => false);
      return { name: c.name, status: passed ? 'ok' : 'failed', duration: performance.now() - start };
    }));
    const failed = results.filter(r => r.status === 'failed').length;
    return { status: failed === 0 ? 'healthy' : failed < results.length ? 'degraded' : 'unhealthy', checks: results, timestamp: new Date() };
  }
}
export const healthChecker = new HealthChecker();
