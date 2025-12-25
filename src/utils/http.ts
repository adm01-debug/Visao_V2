/**
 * HTTP Utilities
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig extends RequestInit {
  baseUrl?: string;
  timeout?: number;
  params?: Record<string, string | number | boolean>;
}

export async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const { baseUrl, timeout = 30000, params, ...init } = config;
  
  const fullUrl = new URL(url, baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, String(value));
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl.toString(), {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export class HttpError extends Error {
  constructor(public status: number, public statusText: string) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function buildQueryString(params: Record<string, unknown>): string {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
}

export function parseQueryString(query: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(query));
}

export const http = {
  get: <T>(url: string, config?: RequestConfig) => request<T>(url, { ...config, method: 'GET' }),
  post: <T>(url: string, body?: unknown, config?: RequestConfig) => 
    request<T>(url, { ...config, method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...config?.headers } }),
  put: <T>(url: string, body?: unknown, config?: RequestConfig) => 
    request<T>(url, { ...config, method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...config?.headers } }),
  patch: <T>(url: string, body?: unknown, config?: RequestConfig) => 
    request<T>(url, { ...config, method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...config?.headers } }),
  delete: <T>(url: string, config?: RequestConfig) => request<T>(url, { ...config, method: 'DELETE' }),
};
