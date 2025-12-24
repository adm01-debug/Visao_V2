export interface ApiResponse<T> { data: T | null; error: string | null; status: number; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number; }
export interface ApiError { message: string; code: string; status: number; }
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface RequestConfig { method: HttpMethod; headers?: Record<string, string>; body?: unknown; timeout?: number; }
