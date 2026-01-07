/**
 * Hook para notificações de alertas em tempo real
 * Com toast visual, som opcional e push notifications do navegador
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  showBrowserNotification,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  getBrowserNotificationsEnabled,
  setBrowserNotificationsEnabled,
  type NotificationPermissionStatus,
} from "@/lib/browserNotifications";

interface AlertPayload {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  camera_name: string;
  type: string;
  timestamp: string;
}

interface RealtimeAlertOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
  severityFilter?: ("low" | "medium" | "high" | "critical")[];
  onAlert?: (alert: AlertPayload) => void;
}

interface RealtimeAlertReturn {
  // Sound controls
  toggleSound: (enabled: boolean) => void;
  isSoundEnabled: () => boolean;
  
  // Push notification controls
  pushPermission: NotificationPermissionStatus;
  isPushEnabled: boolean;
  togglePush: (enabled: boolean) => void;
  requestPushPermission: () => Promise<NotificationPermissionStatus>;
  
  // Test functions
  sendTestPush: () => void;
  sendTestSound: () => void;
}

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CRITICAL_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3";

export function useRealtimeAlertNotifications(
  options: RealtimeAlertOptions = {}
): RealtimeAlertReturn {
  const {
    enabled = true,
    soundEnabled: initialSoundEnabled = true,
    pushEnabled: initialPushEnabled = true,
    severityFilter = ["high", "critical"],
    onAlert,
  } = options;

  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const criticalAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(initialSoundEnabled);
  
  const [pushPermission, setPushPermission] = useState<NotificationPermissionStatus>(
    isNotificationSupported() ? getNotificationPermission() : "denied"
  );
  const [isPushEnabled, setIsPushEnabled] = useState(
    getBrowserNotificationsEnabled() && initialPushEnabled
  );

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    criticalAudioRef.current = new Audio(CRITICAL_SOUND_URL);
    criticalAudioRef.current.volume = 0.7;
    
    // Check localStorage for sound preference
    const soundPref = localStorage.getItem("alert-sound-enabled");
    soundEnabledRef.current = soundPref !== "false";

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (criticalAudioRef.current) {
        criticalAudioRef.current.pause();
        criticalAudioRef.current = null;
      }
    };
  }, []);

  // Check push permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      setPushPermission(getNotificationPermission());
    }
  }, []);

  const playSound = useCallback((isCritical: boolean = false) => {
    if (!soundEnabledRef.current) return;
    
    const audio = isCritical ? criticalAudioRef.current : audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Autoplay blocked - user interaction required
      });
    }
  }, []);

  const toggleSound = useCallback((newEnabled: boolean) => {
    soundEnabledRef.current = newEnabled;
    localStorage.setItem("alert-sound-enabled", String(newEnabled));
  }, []);

  const togglePush = useCallback((newEnabled: boolean) => {
    setIsPushEnabled(newEnabled);
    setBrowserNotificationsEnabled(newEnabled);
  }, []);

  const requestPushPermission = useCallback(async (): Promise<NotificationPermissionStatus> => {
    const permission = await requestNotificationPermission();
    setPushPermission(permission);
    if (permission === "granted") {
      setIsPushEnabled(true);
      setBrowserNotificationsEnabled(true);
    }
    return permission;
  }, []);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { label: "🚨 CRÍTICO", color: "destructive" as const, icon: "🚨" };
      case "high":
        return { label: "⚠️ ALTO", color: "destructive" as const, icon: "⚠️" };
      case "medium":
        return { label: "📢 MÉDIO", color: "warning" as const, icon: "📢" };
      default:
        return { label: "ℹ️ BAIXO", color: "default" as const, icon: "ℹ️" };
    }
  };

  const showPushNotification = useCallback((alert: AlertPayload) => {
    if (!isPushEnabled || pushPermission !== "granted") return;

    showBrowserNotification({
      title: `${getSeverityConfig(alert.severity).icon} VISÃO - ${alert.camera_name}`,
      body: alert.message,
      tag: `alert-${alert.id}`,
      requireInteraction: alert.severity === "critical",
      onClick: () => {
        // Navigate to alerts page when clicked
        window.location.href = "/alertas";
      },
    });
  }, [isPushEnabled, pushPermission]);

  const showAlertToast = useCallback((alert: AlertPayload) => {
    const config = getSeverityConfig(alert.severity);

    // Play sound for high/critical alerts
    if (alert.severity === "critical" || alert.severity === "high") {
      playSound(alert.severity === "critical");
    }

    // Show browser push notification for filtered severities
    if (severityFilter.includes(alert.severity)) {
      showPushNotification(alert);
    }

    const toastFn = alert.severity === "critical" || alert.severity === "high" 
      ? toast.error 
      : alert.severity === "medium" 
        ? toast.warning 
        : toast.info;

    toastFn(alert.message, {
      description: `${config.label} • ${alert.camera_name} • ${new Date(alert.timestamp).toLocaleTimeString("pt-BR")}`,
      duration: alert.severity === "critical" ? 10000 : 5000,
      position: "top-right",
      action: alert.severity === "critical" ? {
        label: "Ver",
        onClick: () => window.location.href = "/alertas",
      } : undefined,
    });

    // Call custom handler
    onAlert?.(alert);
  }, [playSound, showPushNotification, severityFilter, onAlert]);

  // Test functions
  const sendTestPush = useCallback(() => {
    if (pushPermission !== "granted") {
      toast.error("Permissão de notificação não concedida");
      return;
    }

    showBrowserNotification({
      title: "🔔 VISÃO - Teste",
      body: "Esta é uma notificação de teste do sistema de alertas em tempo real.",
      tag: "test-notification",
      requireInteraction: false,
    });
    
    toast.success("Notificação de teste enviada!");
  }, [pushPermission]);

  const sendTestSound = useCallback(() => {
    playSound(false);
    toast.success("Som de teste reproduzido!");
  }, [playSound]);

  // Realtime subscription
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("realtime-alert-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          const newAlert = payload.new as AlertPayload;
          showAlertToast(newAlert);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["sidebar-alerts-count"] });
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, showAlertToast, queryClient]);

  return { 
    toggleSound, 
    isSoundEnabled: () => soundEnabledRef.current,
    pushPermission,
    isPushEnabled,
    togglePush,
    requestPushPermission,
    sendTestPush,
    sendTestSound,
  };
}
