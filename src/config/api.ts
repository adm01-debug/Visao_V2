import { ENV } from './env';

export const API_CONFIG = {
  baseURL: ENV.API_URL,
  timeout: 30000,
  retries: 3,
  headers: { 'Content-Type': 'application/json' },
};

export const createApiUrl = (path: string): string => `${API_CONFIG.baseURL}${path}`;
