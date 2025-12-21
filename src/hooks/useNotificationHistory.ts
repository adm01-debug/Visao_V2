import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationHistoryEntry {
  id: string;
  notification_config_id: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

export const useNotificationHistory = (configId?: string) => {
  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notification_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (configId) {
        query = query.eq('notification_config_id', configId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [configId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const clearHistory = useCallback(async (olderThanDays?: number) => {
    try {
      let query = supabase.from('notification_history').delete();
      
      if (olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        query = query.lt('created_at', cutoffDate.toISOString());
      }

      const { error } = await query;
      if (error) throw error;
      
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  }, [fetchHistory]);

  const getStats = useCallback(() => {
    const total = history.length;
    const sent = history.filter(h => h.status === 'sent').length;
    const failed = history.filter(h => h.status === 'failed').length;
    const delivered = history.filter(h => h.status === 'delivered').length;
    const pending = history.filter(h => h.status === 'pending').length;

    return { total, sent, failed, delivered, pending };
  }, [history]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
    clearHistory,
    getStats,
  };
};
