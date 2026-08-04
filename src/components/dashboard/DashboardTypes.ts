export type AlertSortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc' | 'type';
export type ViewMode = 'grid' | 'stream' | 'map' | 'analytics';
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | 'list';

export interface DashboardSettings {
  viewMode: ViewMode;
  gridLayout: GridLayout;
  showMap: boolean;
  showStats: boolean;
  showAlerts: boolean;
  enableStreaming: boolean;
  enableAnalysis: boolean;
  enableFaceRecognition: boolean;
  enableZones: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export const defaultSettings: DashboardSettings = {
  viewMode: 'grid',
  gridLayout: '2x2',
  showMap: true,
  showStats: true,
  showAlerts: true,
  enableStreaming: true,
  enableAnalysis: false,
  enableFaceRecognition: false,
  enableZones: true,
  autoRefresh: true,
  refreshInterval: 30000,
};

export const severityOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const sortAlerts = <T extends { timestamp: string | Date; severity: string; type: string }>(
  alerts: T[],
  sortBy: AlertSortOption
): T[] => {
  return [...alerts].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'date-asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'severity-desc':
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      case 'severity-asc':
        return (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });
};
