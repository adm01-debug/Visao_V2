/**
 * Alert Manager (Ops)
 */
export interface OpsAlert { id: string; severity: 'info' | 'warning' | 'critical'; title: string; description: string; timestamp: Date; acknowledged: boolean; }
class AlertManager {
  private alerts: OpsAlert[] = [];
  private handlers: ((alert: OpsAlert) => void)[] = [];
  fire(severity: OpsAlert['severity'], title: string, description: string): OpsAlert {
    const alert = { id: crypto.randomUUID(), severity, title, description, timestamp: new Date(), acknowledged: false };
    this.alerts.push(alert);
    this.handlers.forEach(h => h(alert));
    return alert;
  }
  acknowledge(id: string): void { const alert = this.alerts.find(a => a.id === id); if (alert) alert.acknowledged = true; }
  getActive(): OpsAlert[] { return this.alerts.filter(a => !a.acknowledged); }
  onAlert(handler: (alert: OpsAlert) => void): void { this.handlers.push(handler); }
}
export const alertManager = new AlertManager();
