export interface Recording {
  id: string;
  cameraId: string;
  startTime: string;
  endTime: string;
  duration: number;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alertId?: string;
  createdAt: string;
}

export interface RecordingFilter {
  cameraId?: string;
  startDate?: string;
  endDate?: string;
  hasAlert?: boolean;
}
