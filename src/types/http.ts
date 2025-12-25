export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 500;

export interface HttpRequest { url: string; method: HttpMethod; headers?: Record<string, string>; body?: any; params?: Record<string, string>; timeout?: number; }
export interface HttpResponse<T = any> { data: T; status: HttpStatus; headers: Record<string, string>; }
export interface HttpError { status: HttpStatus; message: string; code?: string; details?: any; }

export interface ApiResponse<T = any> { success: boolean; data?: T; error?: HttpError; meta?: { timestamp: string; requestId: string }; }
export interface ApiListResponse<T = any> extends ApiResponse<T[]> { pagination?: { page: number; limit: number; total: number; totalPages: number }; }
