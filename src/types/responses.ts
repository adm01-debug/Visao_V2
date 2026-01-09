// Response Types - Projeto VISÃO
// Tipagem forte para respostas de API

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
}

export interface StreamResponse<T> {
  data: T;
  isComplete: boolean;
  progress?: number;
}

export interface BatchResponse<T> {
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  successCount: number;
  errorCount: number;
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: Record<string, { status: string; latency?: number }>;
}
