export interface Alert {
  id: string;
  type: 'motion' | 'face' | 'plate' | 'zone' | 'object';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cameraId: string;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type AlertSeverity = Alert['severity'];
export type AlertType = Alert['type'];
