export interface AnalyticsSummary {
  totalAlerts: number;
  totalRecordings: number;
  totalPersons: number;
  totalVehicles: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  timeRange: { start: string; end: string };
}
export interface AnalyticsEvent {
  id: string;
  type: string;
  cameraId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
