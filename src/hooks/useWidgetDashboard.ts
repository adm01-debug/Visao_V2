import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout, WidgetInstance, DEFAULT_LAYOUT, WIDGET_CATALOG } from '@/types/widgets';

const STORAGE_KEY = 'visao-dashboard-layout';

export function useWidgetDashboard() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_LAYOUT;
  });

  const [isEditing, setIsEditing] = useState(false);

  // Persist layout changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const addWidget = useCallback((widgetId: string) => {
    const config = WIDGET_CATALOG.find(w => w.id === widgetId);
    if (!config) return;

    const newWidget: WidgetInstance = {
      id: `widget-${Date.now()}`,
      widgetId: config.id,
      type: config.type,
      position: { x: 0, y: 0 }, // Will be placed at first available position
      size: config.defaultSize,
    };

    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeWidget = useCallback((instanceId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== instanceId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateWidget = useCallback((instanceId: string, updates: Partial<WidgetInstance>) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === instanceId ? { ...w, ...updates } : w
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setLayout(prev => {
      const oldIndex = prev.widgets.findIndex(w => w.id === activeId);
      const newIndex = prev.widgets.findIndex(w => w.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newWidgets = [...prev.widgets];
      const [removed] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, removed);
      
      return {
        ...prev,
        widgets: newWidgets,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  const saveLayout = useCallback((name?: string) => {
    if (name) {
      setLayout(prev => ({
        ...prev,
        name,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, []);

  return {
    layout,
    isEditing,
    setIsEditing,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    resetLayout,
    saveLayout,
  };
}
