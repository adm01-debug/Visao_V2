export interface AsyncState<T> { data: T | null; loading: boolean; error: Error | null; }
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingState { isLoading: boolean; loadingKeys: string[]; }
export interface ErrorState { errors: Record<string, string>; hasErrors: boolean; }

export interface UIState { sidebarOpen: boolean; sidebarCollapsed: boolean; theme: 'light' | 'dark' | 'system'; locale: string; }
export interface AuthState { isAuthenticated: boolean; user: any | null; token: string | null; }
export interface FilterState { search: string; filters: Record<string, any>; sort: { field: string; order: 'asc' | 'desc' }; }

export type StateSelector<S, R> = (state: S) => R;
export type StateUpdater<S> = (state: S) => Partial<S>;
