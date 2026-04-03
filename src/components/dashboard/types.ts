import type { DbCamera } from '@/hooks/useCameras';

type CameraStatus = 'online' | 'offline' | 'alert' | 'warning';

export interface UICameraData {
  id: string;
  name: string;
  location: string;
  status: string;
  thumbnail?: string;
  streamUrl?: string;
  lastActivity?: string;
  detectedPeople: number;
  alerts: number;
  latitude: number | null;
  longitude: number | null;
}

export type AlertSortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc' | 'type';
export type ViewMode = 'cards' | 'streams' | 'hybrid';

export function mapDbCameraToUI(dbCamera: DbCamera): UICameraData {
  return {
    id: dbCamera.id,
    name: dbCamera.name,
    location: dbCamera.location,
    status: dbCamera.status,
    thumbnail: dbCamera.thumbnail || undefined,
    streamUrl: dbCamera.stream_url || undefined,
    lastActivity: dbCamera.last_activity || undefined,
    detectedPeople: dbCamera.detected_people || 0,
    alerts: dbCamera.alerts_count || 0,
    latitude: dbCamera.latitude,
    longitude: dbCamera.longitude,
  };
}

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
