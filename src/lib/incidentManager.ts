/**
 * Incident Manager
 */
export interface Incident { id: string; title: string; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'open' | 'investigating' | 'resolved'; createdAt: Date; resolvedAt?: Date; updates: { message: string; timestamp: Date }[]; }
class IncidentManager {
  private incidents: Incident[] = [];
  create(title: string, severity: Incident['severity']): Incident {
    const incident = { id: crypto.randomUUID(), title, severity, status: 'open' as const, createdAt: new Date(), updates: [] };
    this.incidents.push(incident);
    return incident;
  }
  update(id: string, message: string): void { const inc = this.incidents.find(i => i.id === id); if (inc) { inc.updates.push({ message, timestamp: new Date() }); inc.status = 'investigating'; } }
  resolve(id: string): void { const inc = this.incidents.find(i => i.id === id); if (inc) { inc.status = 'resolved'; inc.resolvedAt = new Date(); } }
  getOpen(): Incident[] { return this.incidents.filter(i => i.status !== 'resolved'); }
}
export const incidentManager = new IncidentManager();
