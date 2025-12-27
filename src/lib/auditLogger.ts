/**
 * Audit Logger - Security event tracking
 */

export type AuditAction = 
  | 'login' | 'logout' | 'login_failed' | 'password_change'
  | 'create' | 'read' | 'update' | 'delete'
  | 'export' | 'import' | 'share'
  | 'permission_grant' | 'permission_revoke'
  | 'settings_change' | 'api_key_create' | 'api_key_revoke';

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries = 1000;
  private storageKey = 'visao_audit_log';
  private remoteEndpoint?: string;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) this.entries = JSON.parse(stored);
    } catch { /* ignore */ }
  }

  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.entries.slice(-this.maxEntries)));
  }

  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    this.entries.push(auditEntry);
    this.save();

    if (this.remoteEndpoint) {
      try {
        await fetch(this.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        });
      } catch { /* silent fail */ }
    }
  }

  setRemoteEndpoint(url: string): void {
    this.remoteEndpoint = url;
  }

  getEntries(filter?: Partial<Pick<AuditEntry, 'userId' | 'action' | 'resource'>>): AuditEntry[] {
    if (!filter) return [...this.entries];
    
    return this.entries.filter(e => {
      if (filter.userId && e.userId !== filter.userId) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (filter.resource && e.resource !== filter.resource) return false;
      return true;
    });
  }

  getRecentEntries(count = 50): AuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  getFailedLogins(userId?: string): AuditEntry[] {
    return this.entries.filter(e => 
      e.action === 'login_failed' && (!userId || e.userId === userId)
    );
  }

  clear(): void {
    this.entries = [];
    localStorage.removeItem(this.storageKey);
  }

  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

export const auditLogger = new AuditLogger();
export default AuditLogger;
