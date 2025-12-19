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

// Rule System Types
export type RuleConditionType = 
  | 'people_count'
  | 'idle_time'
  | 'restricted_area'
  | 'no_ppe'
  | 'crowd_detection'
  | 'after_hours_movement'
  | 'unauthorized_access'
  | 'loitering'
  | 'running'
  | 'fighting';

export type RuleAction = 'alert' | 'notification' | 'record' | 'alarm';

export interface RuleCondition {
  type: RuleConditionType;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: number;
  value2?: number; // For 'between' operator
  duration?: number; // In seconds
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: AlertType;
  severity: AlertSeverity;
  conditions: RuleCondition[];
  actions: RuleAction[];
  cameras: string[]; // Camera IDs, empty = all cameras
  schedule: {
    enabled: boolean;
    startTime?: string; // HH:mm format
    endTime?: string;
    days?: number[]; // 0-6 (Sunday-Saturday)
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
