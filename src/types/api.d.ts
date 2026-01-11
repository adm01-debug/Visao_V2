// API Response Types
export interface ApiResponse<T> {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
  error?: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { total: number; page: number; limit: number; hasMore: boolean };
}
