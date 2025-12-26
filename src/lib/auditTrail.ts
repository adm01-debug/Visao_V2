/**
 * Audit Trail
 */
export interface AuditEntry { id: string; action: string; userId: string; resource: string; timestamp: Date; details?: any; ip?: string; }
class AuditTrail {
  private entries: AuditEntry[] = [];
  log(action: string, userId: string, resource: string, details?: any): void {
    this.entries.push({ id: crypto.randomUUID(), action, userId, resource, timestamp: new Date(), details });
  }
  getEntries(filters?: { userId?: string; action?: string; from?: Date; to?: Date }): AuditEntry[] {
    return this.entries.filter(e => (!filters?.userId || e.userId === filters.userId) && (!filters?.action || e.action === filters.action) && (!filters?.from || e.timestamp >= filters.from) && (!filters?.to || e.timestamp <= filters.to));
  }
  export(): string { return JSON.stringify(this.entries, null, 2); }
}
export const auditTrail = new AuditTrail();
