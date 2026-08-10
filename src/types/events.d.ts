// Event Types
export interface AppEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
}

export interface AlertEvent extends AppEvent<{ alertId: string; severity: string }> {
  type: 'alert';
}

export interface CameraEvent extends AppEvent<{ cameraId: string; status: string }> {
  type: 'camera';
}
