/**
 * Cost Monitor
 */
export interface CostEntry { service: string; amount: number; currency: string; period: string; }
class CostMonitor {
  private costs: CostEntry[] = [];
  record(service: string, amount: number, currency = 'USD'): void { this.costs.push({ service, amount, currency, period: new Date().toISOString().slice(0, 7) }); }
  getByService(service: string): CostEntry[] { return this.costs.filter(c => c.service === service); }
  getTotal(period?: string): number { return this.costs.filter(c => !period || c.period === period).reduce((sum, c) => sum + c.amount, 0); }
}
export const costMonitor = new CostMonitor();
