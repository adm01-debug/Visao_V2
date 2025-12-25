export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', LOGOUT: '/auth/logout', REFRESH: '/auth/refresh' },
  CAMERAS: { LIST: '/cameras', DETAIL: '/cameras/:id', STREAM: '/cameras/:id/stream' },
  ALERTS: { LIST: '/alerts', DETAIL: '/alerts/:id', ACKNOWLEDGE: '/alerts/:id/acknowledge' },
  RECORDINGS: { LIST: '/recordings', DETAIL: '/recordings/:id', DOWNLOAD: '/recordings/:id/download' },
  ANALYTICS: { SUMMARY: '/analytics/summary', EVENTS: '/analytics/events' },
} as const;
