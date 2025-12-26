/**
 * Status Page
 */
export interface ServiceStatus { name: string; status: 'operational' | 'degraded' | 'outage'; updatedAt: Date; }
export class StatusPage {
  private services: ServiceStatus[] = [];
  updateService(name: string, status: ServiceStatus['status']): void {
    const existing = this.services.find(s => s.name === name);
    if (existing) { existing.status = status; existing.updatedAt = new Date(); }
    else this.services.push({ name, status, updatedAt: new Date() });
  }
  getStatus(): { overall: string; services: ServiceStatus[] } {
    const hasOutage = this.services.some(s => s.status === 'outage');
    const hasDegraded = this.services.some(s => s.status === 'degraded');
    return { overall: hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational', services: this.services };
  }
}
export const statusPage = new StatusPage();
