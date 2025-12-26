/**
 * SLA Monitoring
 */
export interface SLA { name: string; target: number; current: number; unit: 'percent' | 'ms' | 'count'; }
class SLAMonitor {
  private slas: SLA[] = [];
  define(name: string, target: number, unit: SLA['unit']): void { this.slas.push({ name, target, current: target, unit }); }
  update(name: string, current: number): void { const sla = this.slas.find(s => s.name === name); if (sla) sla.current = current; }
  getViolations(): SLA[] { return this.slas.filter(s => s.unit === 'percent' ? s.current < s.target : s.current > s.target); }
  getAll(): SLA[] { return this.slas; }
}
export const slaMonitor = new SLAMonitor();
