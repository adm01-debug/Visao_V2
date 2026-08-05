/**
 * VISÃO - Dashboard Layout Persistence
 * Persiste a configuração de widgets (ordem, visibilidade) no localStorage
 * com suporte para migração futura ao banco de dados
 */
import { useState, useCallback, useEffect } from 'react';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  size: 'sm' | 'md' | 'lg' | 'full';
}

const STORAGE_KEY = 'dashboard-widget-layout';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', label: 'Estatísticas', visible: true, order: 0, size: 'full' },
  { id: 'cameras', label: 'Câmeras', visible: true, order: 1, size: 'full' },
  { id: 'alerts', label: 'Alertas Recentes', visible: true, order: 2, size: 'lg' },
  { id: 'trends', label: 'Tendências', visible: true, order: 3, size: 'lg' },
  { id: 'map', label: 'Mapa', visible: true, order: 4, size: 'lg' },
  { id: 'by-camera', label: 'Alertas por Câmera', visible: true, order: 5, size: 'md' },
];

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with defaults to pick up new widgets
        const ids = new Set(parsed.map((w) => w.id));
        const merged = [...parsed, ...DEFAULT_WIDGETS.filter((w) => !ids.has(w.id))];
        return merged.sort((a, b) => a.order - b.order);
      }
    } catch {
      /* use defaults */
    }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }, []);

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved!);
      return next.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const visibleWidgets = widgets.filter((w) => w.visible);

  return { widgets, visibleWidgets, toggleWidget, reorderWidgets, resetLayout };
}
