/**
 * VISÃO - Sistema de Vigilância Inteligente
 * API Constants - Endpoints da API
 * 
 * @module constants/api
 */

// ============================================
// TIPOS
// ============================================

export type ApiEndpoints = typeof API_ENDPOINTS;

// ============================================
// ENDPOINTS
// ============================================

export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    ME: '/auth/me',
  },

  // Câmeras
  CAMERAS: {
    LIST: '/cameras',
    DETAIL: '/cameras/:id',
    CREATE: '/cameras',
    UPDATE: '/cameras/:id',
    DELETE: '/cameras/:id',
    STREAM: '/cameras/:id/stream',
    SNAPSHOT: '/cameras/:id/snapshot',
    RECORDING: '/cameras/:id/recording',
    STATUS: '/cameras/:id/status',
  },

  // Alertas
  ALERTS: {
    LIST: '/alerts',
    DETAIL: '/alerts/:id',
    CREATE: '/alerts',
    UPDATE: '/alerts/:id',
    DELETE: '/alerts/:id',
    ACKNOWLEDGE: '/alerts/:id/acknowledge',
    RESOLVE: '/alerts/:id/resolve',
    DISMISS: '/alerts/:id/dismiss',
    UNREAD_COUNT: '/alerts/unread-count',
  },

  // Gravações
  RECORDINGS: {
    LIST: '/recordings',
    DETAIL: '/recordings/:id',
    DELETE: '/recordings/:id',
    DOWNLOAD: '/recordings/:id/download',
    STREAM: '/recordings/:id/stream',
    CLIP: '/recordings/:id/clip',
    EXPORT: '/recordings/export',
  },

  // Zonas
  ZONES: {
    LIST: '/zones',
    DETAIL: '/zones/:id',
    CREATE: '/zones',
    UPDATE: '/zones/:id',
    DELETE: '/zones/:id',
    BY_CAMERA: '/zones/camera/:cameraId',
  },

  // Analytics
  ANALYTICS: {
    SUMMARY: '/analytics/summary',
    EVENTS: '/analytics/events',
    TRENDS: '/analytics/trends',
    HEATMAP: '/analytics/heatmap',
    PEAK_HOURS: '/analytics/peak-hours',
    CAMERAS: '/analytics/cameras',
    RECOGNITION: '/analytics/recognition',
  },

  // Reconhecimento
  RECOGNITION: {
    FACES: '/recognition/faces',
    PLATES: '/recognition/plates',
    PERSONS: '/recognition/persons',
    LOGS: '/recognition/logs',
    TRAIN: '/recognition/train',
  },

  // Configurações
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
    NOTIFICATIONS: '/settings/notifications',
    SECURITY: '/settings/security',
    INTEGRATIONS: '/settings/integrations',
  },

  // Usuários
  USERS: {
    LIST: '/users',
    DETAIL: '/users/:id',
    CREATE: '/users',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    ROLES: '/users/:id/roles',
  },

  // Relatórios
  REPORTS: {
    GENERATE: '/reports/generate',
    LIST: '/reports',
    DOWNLOAD: '/reports/:id/download',
  },
} as const;

// ============================================
// HELPERS
// ============================================

/**
 * Substituir parâmetros na URL
 * @example buildUrl(API_ENDPOINTS.CAMERAS.DETAIL, { id: '123' }) // '/cameras/123'
 */
export const buildUrl = (
  endpoint: string,
  params: Record<string, string>
): string => {
  let url = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, value);
  });
  return url;
};

export default API_ENDPOINTS;
