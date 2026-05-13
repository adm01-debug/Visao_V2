import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { AuditLog, LogLevel, LogCategory } from '@/components/security/SecurityTypes';

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mappedLogs: AuditLog[] = (data || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        level: (log.severity || 'info') as LogLevel,
        category: (log.entity_type || 'system') as LogCategory,
        action: log.action,
        description: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
        userId: log.user_id || undefined,
        // Em um sistema real, faríamos um join com profiles para pegar o nome
        userName: log.user_id ? 'Usuário' : 'Sistema',
      }));

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
