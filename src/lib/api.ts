/**
 * VIS-O - Sistema de Vigilância Inteligente
 * API Client Module
 *
 * @module lib/api
 */

import { logger } from './logger';

interface APIConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface APIResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
}

interface APIError {
  message: string;
  status: number;
  code?: string;
}

const defaultConfig: APIConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

class APIClient {
  private config: APIConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<APIConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const requestId = `${method}-${endpoint}-${Date.now()}`;

    // Create abort controller for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const error: APIError = {
          message: responseData?.message || response.statusText,
          status: response.status,
          code: responseData?.code,
        };
        logger.error('api', `Request failed: ${method} ${endpoint}`, error.message);
        throw error;
      }

      return {
        data: responseData as T,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('api', `Request timeout: ${method} ${endpoint}`);
        throw { message: 'Request timeout', status: 408, code: 'TIMEOUT' };
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  cancelAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }
}

// Export singleton instance
export const api = new APIClient();

// Export class for custom instances
export { APIClient };
export type { APIConfig, APIResponse, APIError };
