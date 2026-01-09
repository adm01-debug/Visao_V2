// State Types - Projeto VISÃO
// Tipagem forte para gerenciamento de estado

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T, E = Error> {
  data: T | null;
  status: LoadingState;
  error: E | null;
}

export interface EntityState<T> {
  ids: string[];
  entities: Record<string, T>;
  selectedId: string | null;
}

export interface FilterState {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, string | number | boolean | string[]>;
  page: number;
  pageSize: number;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  modalStack: string[];
  notifications: NotificationState[];
  isOnline: boolean;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface AuthState {
  user: UserState | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UserState {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  avatar?: string;
}

export type StateUpdater<T> = (state: T) => Partial<T> | void;
export type StateSetter<T> = (updater: StateUpdater<T>) => void;
