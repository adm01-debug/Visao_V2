import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// TIPOS
// ============================================

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

interface AlertPayload {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  camera_name: string;
  type: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  toggleAlertSound: (enabled: boolean) => void;
  isAlertSoundEnabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// ============================================
// PROVIDER
// ============================================

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAlertSoundEnabled, setIsAlertSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("alert-sound-enabled") !== "false";
    }
    return true;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback(() => {
    if (isAlertSoundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked
      });
    }
  }, [isAlertSoundEnabled]);

  const showAlertToast = useCallback((alert: AlertPayload) => {
    const severityConfig: Record<string, { label: string }> = {
      critical: { label: "CRÍTICO" },
      high: { label: "ALTO" },
      medium: { label: "MÉDIO" },
      low: { label: "BAIXO" },
    };

    const config = severityConfig[alert.severity] || severityConfig.low;

    // Play sound for high/critical
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

  // Realtime subscription for alerts
  useEffect(() => {
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
          queryClient.invalidateQueries({ queryKey: ["sidebar-alerts-count"] });
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showAlertToast, queryClient]);

  const addNotification = useCallback((n: Omit<Notification, "id">) => {
    const id = Math.random().toString(36);
    setNotifications((prev) => [...prev, { ...n, id }]);
    if (n.duration !== 0) {
      setTimeout(() => removeNotification(id), n.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleAlertSound = useCallback((enabled: boolean) => {
    setIsAlertSoundEnabled(enabled);
    localStorage.setItem("alert-sound-enabled", String(enabled));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        toggleAlertSound,
        isAlertSoundEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
