export * from './clips';
export * from './continuousAnalysis';
export * from './extended';
export * from './faceRecognition';
export * from './rules';
export * from './streaming';
export * from './surveillance';
export * from './zones';

// Common types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export type SortOrder = 'asc' | 'desc';
export type Status = 'online' | 'offline' | 'error' | 'warning';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
