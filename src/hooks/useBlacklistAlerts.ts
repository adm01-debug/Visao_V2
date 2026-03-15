import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playCriticalAlertSound } from '@/lib/alertSounds';
import {
  showBrowserNotification,
  getBrowserNotificationsEnabled,
  getNotificationPermission
} from '@/lib/browserNotifications';

interface BlacklistAlert {
  id: string;
  personId: string;
  personName: string;
  cameraId: string | null;
  cameraName: string;
  confidence: number;
  timestamp: Date;
  imageUrl?: string;
}

interface UseBlacklistAlertsOptions {
  enabled?: boolean;
  onBlacklistDetected?: (alert: BlacklistAlert) => void;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export function useBlacklistAlerts({
  enabled = true,
  onBlacklistDetected,
  soundEnabled = true,
  notificationsEnabled = true,
}: UseBlacklistAlertsOptions = {}) {
  const [recentAlerts, setRecentAlerts] = useState<BlacklistAlert[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const personsCache = useRef<Map<string, { name: string; listType: string }>>(new Map());
  const camerasCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const loadCache = async () => {
      try {
        const { data: persons } = await supabase
          .from('registered_persons')
          .select('id, name, list_type')
          .eq('list_type', 'blacklist');

        if (persons) {
          persons.forEach(p => {
            personsCache.current.set(p.id, { name: p.name, listType: p.list_type || 'none' });
          });
        }

        const { data: cameras } = await supabase
          .from('cameras')
          .select('id, name');

        if (cameras) {
          cameras.forEach(c => {
            camerasCache.current.set(c.id, c.name);
          });
        }
      } catch (err) {
        logger.error('Failed to load blacklist cache', err);
      }
    };

    loadCache();
  }, []);

  const handleBlacklistAlert = useCallback(async (
    personId: string,
    cameraId: string | null,
    confidence: number,
    logId: string,
    imageUrl?: string
  ) => {
    try {
      let personInfo = personsCache.current.get(personId);

      if (!personInfo) {
        const { data } = await supabase
          .from('registered_persons')
          .select('name, list_type')
          .eq('id', personId)
          .maybeSingle();

        if (data) {
          personInfo = { name: data.name, listType: data.list_type || 'none' };
          personsCache.current.set(personId, personInfo);
        }
      }

      if (!personInfo || personInfo.listType !== 'blacklist') {
        return;
      }

      let cameraName = 'Câmera desconhecida';
      if (cameraId) {
        cameraName = camerasCache.current.get(cameraId) || cameraName;

        if (!camerasCache.current.has(cameraId)) {
          const { data } = await supabase
            .from('cameras')
            .select('name')
            .eq('id', cameraId)
            .maybeSingle();

          if (data) {
            cameraName = data.name;
            camerasCache.current.set(cameraId, cameraName);
          }
        }
      }

      const alert: BlacklistAlert = {
        id: logId,
        personId,
        personName: personInfo.name,
        cameraId,
        cameraName,
        confidence,
        timestamp: new Date(),
        imageUrl,
      };

      setRecentAlerts(prev => [alert, ...prev.slice(0, 9)]);
      setAlertCount(prev => prev + 1);

      if (soundEnabled) {
        playCriticalAlertSound();
      }

      toast.error(`🚨 ALERTA: ${personInfo.name} detectado!`, {
        description: `Pessoa na blacklist detectada em ${cameraName}`,
        duration: 15000,
        action: {
          label: 'Ver',
          onClick: () => {
            window.location.href = '/recognition-logs';
          },
        },
      });

      if (notificationsEnabled && getBrowserNotificationsEnabled() && getNotificationPermission() === 'granted') {
        showBrowserNotification({
          title: '🚨 ALERTA DE SEGURANÇA',
          body: `${personInfo.name} detectado em ${cameraName}\nConfiança: ${(confidence * 100).toFixed(0)}%`,
          tag: `blacklist-${logId}`,
          requireInteraction: true,
          onClick: () => {
            window.focus();
            window.location.href = '/recognition-logs';
          },
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('alerts').insert({
          type: 'security',
          severity: 'critical',
          camera_name: cameraName,
          camera_id: cameraId,
          message: `Pessoa na blacklist detectada: ${personInfo.name}`,
          thumbnail: imageUrl,
          user_id: userData.user.id,
        });
      }

      onBlacklistDetected?.(alert);
    } catch (err) {
      logger.error('Failed to handle blacklist alert', err);
    }
  }, [soundEnabled, notificationsEnabled, onBlacklistDetected]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('blacklist-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recognition_logs',
        },
        async (payload) => {
          try {
            const log = payload.new as {
              id: string;
              person_id: string | null;
              camera_id: string | null;
              confidence: number | null;
              recognized: boolean;
              image_url: string | null;
            };

            if (log.recognized && log.person_id && log.confidence) {
              await handleBlacklistAlert(
                log.person_id,
                log.camera_id,
                Number(log.confidence),
                log.id,
                log.image_url || undefined
              );
            }
          } catch (err) {
            logger.error('Error processing recognition log', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, handleBlacklistAlert]);

  const clearAlerts = useCallback(() => {
    setRecentAlerts([]);
    setAlertCount(0);
  }, []);

  return {
    recentAlerts,
    alertCount,
    clearAlerts,
  };
}