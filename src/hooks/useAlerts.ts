import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { mockAlerts } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeAlerts } from './useRealtimeAlerts';

export type DbAlert = Tables<'alerts'>;
export type DbAlertInsert = TablesInsert<'alerts'>;
export type DbAlertUpdate = TablesUpdate<'alerts'>;

export function useAlerts() {
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar alertas';
      setError(message);
      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  const seedAlerts = async () => {
    if (!user) return;
    
    try {
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id')
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) {
        return; // Already has data
      }

      // Map old alert types to new ones
      const mapAlertType = (type: string) => {
        const typeMap: Record<string, 'security' | 'safety' | 'operations' | 'access' | 'analytics'> = {
          'security': 'security',
          'safety': 'safety',
          'productivity': 'operations',
          'intrusion': 'access',
        };
        return typeMap[type] || 'security';
      };

      const alertsToInsert: DbAlertInsert[] = mockAlerts.map(a => ({
        camera_name: a.cameraName,
        type: mapAlertType(a.type),
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp.toISOString(),
        is_read: a.isRead,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('alerts')
        .insert(alertsToInsert);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error seeding alerts:', err);
    }
  };

  const createAlert = async (alert: Omit<DbAlertInsert, 'user_id'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({ ...alert, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      // Don't update state here - realtime will handle it
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar alerta';
      toast.error(message);
      throw err;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      // Don't update state here - realtime will handle it
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao marcar alerta como lido';
      toast.error(message);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      toast.success('Todos os alertas marcados como lidos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao marcar alertas como lidos';
      toast.error(message);
      throw err;
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // Don't update state here - realtime will handle it
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir alerta';
      toast.error(message);
      throw err;
    }
  };

  // Realtime handlers
  const handleNewAlert = useCallback((newAlert: DbAlert) => {
    setAlerts(prev => {
      // Check if alert already exists to avoid duplicates
      if (prev.some(a => a.id === newAlert.id)) return prev;
      return [newAlert, ...prev];
    });
  }, []);

  const handleAlertUpdated = useCallback((updatedAlert: DbAlert) => {
    setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
  }, []);

  const handleAlertDeleted = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  // Subscribe to realtime updates
  useRealtimeAlerts({
    onNewAlert: handleNewAlert,
    onAlertUpdated: handleAlertUpdated,
    onAlertDeleted: handleAlertDeleted,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      fetchAlerts().then(() => seedAlerts());
    }
  }, [user]);

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    refetch: fetchAlerts,
    createAlert,
    markAsRead,
    markAllAsRead,
    deleteAlert,
    unreadCount: alerts.filter(a => !a.is_read).length,
  };
}
