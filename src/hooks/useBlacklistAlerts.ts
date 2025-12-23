import { useEffect, useCallback, useRef, useState } from 'react';
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

  // Load persons and cameras cache
  useEffect(() => {
    const loadCache = async () => {
      // Load blacklisted persons
      const { data: persons } = await supabase
        .from('registered_persons')
        .select('id, name, list_type')
        .eq('list_type', 'blacklist');
      
      if (persons) {
        persons.forEach(p => {
          personsCache.current.set(p.id, { name: p.name, listType: p.list_type || 'none' });
        });
      }

      // Load cameras
      const { data: cameras } = await supabase
        .from('cameras')
        .select('id, name');
      
      if (cameras) {
        cameras.forEach(c => {
          camerasCache.current.set(c.id, c.name);
        });
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
    // Get person info
    let personInfo = personsCache.current.get(personId);
    
    if (!personInfo) {
      // Fetch from DB if not in cache
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

    // Only alert for blacklisted persons
    if (!personInfo || personInfo.listType !== 'blacklist') {
      return;
    }

    // Get camera name
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

    // rm

    // Update state
    setRecentAlerts(prev => [alert, ...prev.slice(0, 9)]);
    setAlertCount(prev => prev + 1);

    // Play critical sound
    if (soundEnabled) {
      playCriticalAlertSound();
    }

    // Show toast
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

    // Show browser notification
    if (notificationsEnabled && getBrowserNotificationsEnabled() && getNotificationPermission() === 'granted') {
      showBrowserNotification({
        title: `🚨 ALERTA DE SEGURANÇA`,
        body: `${personInfo.name} detectado em ${cameraName}
Confiança: ${(confidence * 100).toFixed(0)}%`,
        tag: `blacklist-${logId}`,
        requireInteraction: true,
        onClick: () => {
          window.focus();
          window.location.href = '/recognition-logs';
        },
      });
    }

    // Create alert in database
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

    // Callback
    onBlacklistDetected?.(alert);
  }, [soundEnabled, notificationsEnabled, onBlacklistDetected]);

  // Subscribe to realtime recognition logs
  useEffect(() => {
    if (!enabled) return;

    // rm

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
          const log = payload.new as {
            id: string;
            person_id: string | null;
            camera_id: string | null;
            confidence: number | null;
            recognized: boolean;
            image_url: string | null;
          };

          // rm

          // Only process if person was recognized and has confidence
          if (log.recognized && log.person_id && log.confidence) {
            await handleBlacklistAlert(
              log.person_id,
              log.camera_id,
              Number(log.confidence),
              log.id,
              log.image_url || undefined
            );
          }
        }
      )
      .subscribe((status) => {
        // rm
      });

    return () => {
      // rm
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
