/**
 * Tipos compartilhados para componentes de câmera
 */

export type ViewMode = 'grid-1x1' | 'grid-2x2' | 'grid-3x3' | 'grid-4x4' | 'list';
export type CameraStatus = 'online' | 'offline' | 'alert' | 'warning';

export interface CameraData {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  stream_url: string | null;
  thumbnail: string | null;
  detected_people: number | null;
  alerts_count: number | null;
  latitude: number | null;
  longitude: number | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface CameraStats {
  alertsToday: number;
  peopleDetected: number;
  recordingMinutes: number;
  analysisCount: number;
}

export const GRID_CLASSES: Record<ViewMode, string> = {
  'grid-1x1': 'grid-cols-1',
  'grid-2x2': 'grid-cols-1 md:grid-cols-2',
  'grid-3x3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  'grid-4x4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  'list': 'flex flex-col',
};
