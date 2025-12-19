import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DbAlert } from './useAlerts';
import { AlertTriangle, Shield, HardHat, Activity, BarChart3 } from 'lucide-react';

const alertTypeLabels: Record<string, string> = {
  security: 'Segurança',
  safety: 'EPI/Segurança',
  operations: 'Operações',
  access: 'Acesso',
  analytics: 'Analytics',
};

const severityLabels: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

interface UseRealtimeAlertsOptions {
  onNewAlert: (alert: DbAlert) => void;
  onAlertUpdated: (alert: DbAlert) => void;
  onAlertDeleted: (alertId: string) => void;
  enabled?: boolean;
}

export function useRealtimeAlerts({
  onNewAlert,
  onAlertUpdated,
  onAlertDeleted,
  enabled = true,
}: UseRealtimeAlertsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const newAlert = payload.new as DbAlert;
          console.log('New alert received:', newAlert);
          
          // Show toast notification
          const typeLabel = alertTypeLabels[newAlert.type] || newAlert.type;
          const severityLabel = severityLabels[newAlert.severity] || newAlert.severity;
          
          if (newAlert.severity === 'critical') {
            toast.error(`🚨 ALERTA CRÍTICO: ${newAlert.message}`, {
              description: `${newAlert.camera_name} • ${typeLabel}`,
              duration: 10000,
            });
          } else if (newAlert.severity === 'high') {
            toast.warning(`⚠️ ${newAlert.message}`, {
              description: `${newAlert.camera_name} • ${typeLabel}`,
              duration: 7000,
            });
          } else {
            toast.info(`${newAlert.message}`, {
              description: `${newAlert.camera_name} • ${typeLabel} • ${severityLabel}`,
              duration: 5000,
            });
          }
          
          onNewAlert(newAlert);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updatedAlert = payload.new as DbAlert;
          console.log('Alert updated:', updatedAlert);
          onAlertUpdated(updatedAlert);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const deletedId = payload.old.id as string;
          console.log('Alert deleted:', deletedId);
          onAlertDeleted(deletedId);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from alerts realtime');
      supabase.removeChannel(channel);
    };
  }, [enabled, onNewAlert, onAlertUpdated, onAlertDeleted]);
}
