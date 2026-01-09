// Alert Context - Projeto VISÃO
// Contexto de alertas com tipagem forte

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'intrusion' | 'blacklist' | 'ppe_missing' | 'zone_violation' | 'plate_detected' | 'unknown_person';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  cameraId: string;
  cameraName?: string;
  message: string;
  imageUrl?: string;
  personId?: string;
  zoneId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, string | number | boolean>;
}

export interface AlertFilters {
  types?: AlertType[];
  severities?: AlertSeverity[];
  cameraIds?: string[];
  acknowledged?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AlertContextState {
  alerts: Alert[];
  unreadCount: number;
  filters: AlertFilters;
  isLoading: boolean;
}

export interface AlertContextActions {
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  deleteAlert: (id: string) => void;
  setFilters: (filters: AlertFilters) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
}

type AlertContextValue = AlertContextState & AlertContextActions;

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filters, setFiltersState] = useState<AlertFilters>({});
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  const addAlert = useCallback((alertData: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>) => {
    const alert: Alert = {
      ...alertData,
      id: crypto.randomUUID(),
      acknowledged: false,
      createdAt: new Date(),
    };
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, acknowledged: true, acknowledgedAt: new Date() } : a
      )
    );
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAlerts((prev) =>
      prev.map((a) => ({ ...a, acknowledged: true, acknowledgedAt: new Date() }))
    );
  }, []);

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const setFilters = useCallback((newFilters: AlertFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AlertContextValue = {
    alerts,
    unreadCount,
    filters,
    isLoading,
    addAlert,
    acknowledgeAlert,
    acknowledgeAll,
    deleteAlert,
    setFilters,
    clearFilters,
    refresh,
  };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

export const useAlertContext = (): AlertContextValue => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlertContext must be used within AlertProvider');
  }
  return context;
};

export default AlertContext;
