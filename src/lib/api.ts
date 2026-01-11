/**
 * API Client utilities
 */

export const api = {
  baseUrl: "",
  headers: {} as Record<string, string>,
};

export async function get<T>(url: string): Promise<T> {
  const response = await fetch(api.baseUrl + url, {
    method: "GET",
    headers: api.headers,
  });
  return response.json();
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(api.baseUrl + url, {
    method: "POST",
    headers: { ...api.headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(api.baseUrl + url, {
    method: "PUT",
    headers: { ...api.headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function del<T>(url: string): Promise<T> {
  const response = await fetch(api.baseUrl + url, {
    method: "DELETE",
    headers: api.headers,
  });
  return response.json();
}

export default api;

