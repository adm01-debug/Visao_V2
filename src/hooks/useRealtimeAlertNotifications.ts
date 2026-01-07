/**
 * Hook para notificações de alertas em tempo real
 * Com toast visual e som opcional
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlertPayload {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  camera_name: string;
  type: string;
  timestamp: string;
}

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useRealtimeAlertNotifications(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(true);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    // Check localStorage for sound preference
    const soundPref = localStorage.getItem("alert-sound-enabled");
    soundEnabledRef.current = soundPref !== "false";

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabledRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked - user interaction required
      });
    }
  }, []);

  const toggleSound = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    localStorage.setItem("alert-sound-enabled", String(enabled));
  }, []);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { label: "CRÍTICO", color: "destructive" as const };
      case "high":
        return { label: "ALTO", color: "destructive" as const };
      case "medium":
        return { label: "MÉDIO", color: "warning" as const };
      default:
        return { label: "BAIXO", color: "default" as const };
    }
  };

  const showAlertToast = useCallback((alert: AlertPayload) => {
    const config = getSeverityConfig(alert.severity);

    // Play sound for high/critical alerts
    if (alert.severity === "critical" || alert.severity === "high") {
      playSound();
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
    });
  }, [playSound]);

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

  return { toggleSound, isSoundEnabled: () => soundEnabledRef.current };
}
