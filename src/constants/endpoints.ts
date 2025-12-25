const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ENDPOINTS = {
  AUTH: { LOGIN: `${BASE_URL}/auth/login`, LOGOUT: `${BASE_URL}/auth/logout`, REFRESH: `${BASE_URL}/auth/refresh`, ME: `${BASE_URL}/auth/me` },
  CAMERAS: { LIST: `${BASE_URL}/cameras`, DETAIL: (id: string) => `${BASE_URL}/cameras/${id}`, STREAM: (id: string) => `${BASE_URL}/cameras/${id}/stream` },
  ALERTS: { LIST: `${BASE_URL}/alerts`, DETAIL: (id: string) => `${BASE_URL}/alerts/${id}`, ACKNOWLEDGE: (id: string) => `${BASE_URL}/alerts/${id}/acknowledge` },
  RECORDINGS: { LIST: `${BASE_URL}/recordings`, DETAIL: (id: string) => `${BASE_URL}/recordings/${id}`, DOWNLOAD: (id: string) => `${BASE_URL}/recordings/${id}/download` },
  USERS: { LIST: `${BASE_URL}/users`, DETAIL: (id: string) => `${BASE_URL}/users/${id}` },
  REPORTS: { GENERATE: `${BASE_URL}/reports`, DOWNLOAD: (id: string) => `${BASE_URL}/reports/${id}/download` },
  ANALYTICS: { DASHBOARD: `${BASE_URL}/analytics/dashboard`, HEATMAP: `${BASE_URL}/analytics/heatmap` },
};

export default ENDPOINTS;
