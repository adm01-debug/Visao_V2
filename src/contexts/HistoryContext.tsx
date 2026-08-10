/**
 * VISÃO - HistoryContext
 * Tracks navigation history to support "back multiple steps"
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface HistoryEntry {
  pathname: string;
  label: string;
  timestamp: number;
}

interface HistoryContextType {
  history: HistoryEntry[];
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

// Route labels for history (copied from Breadcrumbs)
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cameras': 'Câmeras',
  '/alerts': 'Alertas',
  '/zones': 'Zonas',
  '/recordings': 'Gravações',
  '/analytics': 'Analytics',
  '/settings': 'Configurações',
  '/security': 'Segurança',
  '/face-recognition': 'Reconhecimento Facial',
  '/license-plate': 'Placas',
  '/heatmap': 'Mapa de Calor',
  '/reports': 'Relatórios',
  '/ppe': 'EPI',
  '/people': 'Pessoas',
  '/recognition-logs': 'Logs de Reconhecimento',
  '/recognition-analytics': 'Analytics de Reconhecimento',
  '/profile': 'Perfil',
  '/users': 'Gestão de Usuários',
  '/panic-events': 'Eventos de Pânico',
};

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const location = useLocation();

  useEffect(() => {
    const label = ROUTE_LABELS[location.pathname];
    if (label) {
      setHistory((prev) => {
        // Avoid consecutive duplicates
        if (prev.length > 0 && prev[0]?.pathname === location.pathname) return prev;

        const newEntry = {
          pathname: location.pathname,
          label,
          timestamp: Date.now(),
        };

        // Keep last 10 entries
        return [newEntry, ...prev].slice(0, 10);
      });
    }
  }, [location.pathname]);

  const clearHistory = () => setHistory([]);

  return (
    <HistoryContext.Provider value={{ history, clearHistory }}>{children}</HistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useNavigationHistory must be used within a HistoryProvider');
  }
  return context;
}
