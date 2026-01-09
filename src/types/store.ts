// Store Types - Projeto VISÃO
// Tipagem forte para gerenciamento de estado

export interface BaseState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface StoreState extends BaseState {
  data: Record<string, unknown>;
}

export interface StoreActions<T> {
  set: (key: keyof T, value: T[keyof T]) => void;
  reset: () => void;
  hydrate: (data: Partial<T>) => void;
}

export type StoreSelector<T, R> = (state: T) => R;

export interface AsyncStoreState<T> extends BaseState {
  data: T | null;
  isStale: boolean;
}

export interface PaginatedState<T> extends BaseState {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

export type StoreMiddleware<T> = (
  set: (state: Partial<T>) => void,
  get: () => T,
  api: unknown
) => (state: Partial<T>) => void;

export interface StoreConfig<T> {
  name: string;
  initialState: T;
  persist?: boolean;
  devtools?: boolean;
}
