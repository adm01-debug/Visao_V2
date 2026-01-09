// HTTP Types - Projeto VISÃO
// Tipagem forte para requisições HTTP

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpStatus = 
  | 200 | 201 | 204 
  | 400 | 401 | 403 | 404 | 409 | 422 
  | 500 | 502 | 503;

export interface HttpHeaders {
  'Content-Type'?: string;
  'Authorization'?: string;
  'Accept'?: string;
  'X-Request-Id'?: string;
  [key: string]: string | undefined;
}

export interface HttpRequest<T = unknown> {
  url: string;
  method: HttpMethod;
  headers?: HttpHeaders;
  body?: T;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: HttpStatus;
  headers: HttpHeaders;
  ok: boolean;
}

export interface HttpError {
  status: HttpStatus;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: HttpError;
  timestamp: string;
}

export type RequestInterceptor = (config: HttpRequest) => HttpRequest | Promise<HttpRequest>;
export type ResponseInterceptor<T> = (response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
