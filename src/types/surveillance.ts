export type AlertType = 'security' | 'productivity' | 'safety' | 'intrusion';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CameraStatus = 'online' | 'offline' | 'alert' | 'warning';

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  thumbnail?: string;
  lastActivity?: string;
  detectedPeople?: number;
  alerts?: number;
}

export interface Alert {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  isRead: boolean;
  thumbnail?: string;
}

export interface AnalyticsData {
  totalCameras: number;
  onlineCameras: number;
  activeAlerts: number;
  detectedPeople: number;
  productivityScore: number;
  securityScore: number;
}
