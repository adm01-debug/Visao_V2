/**
 * HTTP Client utilities
 */

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export async function request<T>(url: string, options?: RequestInit & HttpOptions): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function get<T>(url: string, options?: HttpOptions): Promise<T> {
  return request<T>(url, { method: "GET", ...options });
}

export function post<T>(url: string, data?: unknown, options?: HttpOptions): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
}

export function put<T>(url: string, data?: unknown, options?: HttpOptions): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
}

export function del<T>(url: string, options?: HttpOptions): Promise<T> {
  return request<T>(url, { method: "DELETE", ...options });
}

export default { request, get, post, put, del };

