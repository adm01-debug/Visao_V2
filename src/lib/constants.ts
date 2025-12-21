export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const CAMERA_STATUSES = ['online', 'offline', 'error'] as const;
export const ALERT_TYPES = ['motion', 'face', 'zone', 'plate', 'ppe'] as const;
export const NOTIFICATION_CHANNELS = ['telegram', 'email', 'webhook', 'push'] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/webm'];

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  CAMERAS: '/cameras',
  ALERTS: '/alerts',
  PEOPLE: '/people',
  ZONES: '/zones',
  RULES: '/rules',
  SETTINGS: '/settings',
} as const;
