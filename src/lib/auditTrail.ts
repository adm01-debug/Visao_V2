// Audit Trail - Projeto VISÃO
// Sistema de auditoria com tipagem forte

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'config_change';

export type AuditResource =
  | 'camera'
  | 'alert'
  | 'person'
  | 'zone'
  | 'recording'
  | 'rule'
  | 'user'
  | 'settings';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  changes?: AuditChanges;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChanges {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  fields: string[];
}

export interface AuditMetadata {
  source: 'web' | 'api' | 'system' | 'automation';
  sessionId?: string;
  correlationId?: string;
  duration?: number;
}

export interface AuditFilter {
  userId?: string;
  action?: AuditAction | AuditAction[];
  resource?: AuditResource | AuditResource[];
  startDate?: Date;
  endDate?: Date;
  resourceId?: string;
}

export interface AuditLogConfig {
  enabled: boolean;
  retentionDays: number;
  excludeActions?: AuditAction[];
  excludeResources?: AuditResource[];
  maskFields?: string[];
}

export const createAuditEntry = (
  userId: string,
  userName: string,
  action: AuditAction,
  resource: AuditResource,
  options?: Partial<AuditEntry>
): AuditEntry => ({
  id: crypto.randomUUID(),
  timestamp: new Date(),
  userId,
  userName,
  action,
  resource,
  ...options,
});

export const logAudit = async (entry: AuditEntry): Promise<void> => {
  console.info('[AUDIT]', JSON.stringify(entry));
};
