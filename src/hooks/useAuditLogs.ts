import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { AuditLog, LogLevel, LogCategory } from '@/components/security/SecurityTypes';

const KNOWN_LEVELS: LogLevel[] = ['info', 'warning', 'error', 'critical'];
const KNOWN_CATEGORIES: LogCategory[] = [
  'auth',
  'access',
  'system',
  'camera',
  'alert',
  'config',
  'user',
];

function normalizeLevel(value: unknown): LogLevel {
  const v = typeof value === 'string' ? value.toLowerCase() : '';
  return (KNOWN_LEVELS as string[]).includes(v) ? (v as LogLevel) : 'info';
}

function normalizeCategory(value: unknown): LogCategory {
  const v = typeof value === 'string' ? value.toLowerCase() : '';
  return (KNOWN_CATEGORIES as string[]).includes(v) ? (v as LogCategory) : 'system';
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mappedLogs: AuditLog[] = (data || []).map((log) => {
        return {
          id: log.id,
          timestamp: log.created_at,
          level: normalizeLevel(log.severity),
          category: normalizeCategory(log.entity_type),
          action: log.action,
          description:
            typeof log.details === 'string'
              ? log.details
              : log.details
                ? JSON.stringify(log.details)
                : 'Sem detalhes',
          userId: log.user_id || undefined,
          userName: log.user_id ? 'Usuário' : 'Sistema',
          ipAddress: log.ip_address || undefined,
        };
      });

      setLogs(mappedLogs);
    } catch (err) {
      logger.error('Erro ao buscar audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
